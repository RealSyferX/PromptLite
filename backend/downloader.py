import os
import re
import threading
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


class DownloadError(RuntimeError):
    pass


@dataclass
class DownloadJob:
    id: str
    model_id: str
    folder_name: str
    destination: str
    status: str
    message: str
    error: Optional[str]
    started_at: float
    completed_at: Optional[float] = None
    removed_files: int = 0
    reclaimed_bytes: int = 0


class ModelDownloader:
    """Downloads Hugging Face model snapshots into the local models folder."""

    VRAM_HEAVY_MODEL_TERMS = (
        "flux",
        "sdxl",
        "sd-xl",
        "stable-diffusion-xl",
        "stable_diffusion_xl",
        "stable-cascade",
        "ssd-1b",
        "kandinsky",
        "wuerstchen",
        "stable-diffusion-3",
        "sd3",
        "sd-3",
        "z-image",
        "qwen",
        "hidream",
        "hunyuan",
        "pixart",
        "sana",
        "wan",
        "ltx",
        "video",
        "controlnet",
        "inpaint",
        "refiner",
        "upscale",
    )

    def __init__(self, config_manager) -> None:
        self.config_manager = config_manager
        self.jobs: Dict[str, DownloadJob] = {}
        self.lock = threading.Lock()

    def start_download(
        self,
        model_id: str,
        folder_name: Optional[str] = None,
        revision: Optional[str] = None,
    ) -> Dict[str, Any]:
        cleaned_model_id = self._validate_model_id(model_id)
        self._validate_cpu_only_model_metadata(cleaned_model_id)
        safe_folder_name = self._safe_folder_name(folder_name or cleaned_model_id.replace("/", "--"))
        destination = self._destination_for(safe_folder_name)
        job_id = uuid.uuid4().hex

        job = DownloadJob(
            id=job_id,
            model_id=cleaned_model_id,
            folder_name=safe_folder_name,
            destination=str(destination),
            status="queued",
            message="Download queued.",
            error=None,
            started_at=time.time(),
        )

        with self.lock:
            self.jobs[job_id] = job

        thread = threading.Thread(
            target=self._download_worker,
            args=(job_id, cleaned_model_id, destination, revision),
            daemon=True,
        )
        thread.start()

        return self.get_job(job_id)

    def list_jobs(self) -> Dict[str, Any]:
        with self.lock:
            jobs = [asdict(job) for job in self.jobs.values()]

        jobs.sort(key=lambda item: item["started_at"], reverse=True)
        return {"success": True, "downloads": jobs}

    def get_job(self, job_id: str) -> Dict[str, Any]:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                raise DownloadError("Download job was not found.")
            return {"success": True, **asdict(job)}

    def _download_worker(self, job_id: str, model_id: str, destination: Path, revision: Optional[str]) -> None:
        self._update_job(job_id, status="running", message="Connecting to Hugging Face.")

        try:
            try:
                from huggingface_hub import snapshot_download
            except ImportError as error:
                raise DownloadError("huggingface_hub is not installed. Run scripts\\install-python-deps.bat again.") from error

            destination.mkdir(parents=True, exist_ok=True)
            self._update_job(job_id, message=f"Downloading {model_id}. This can take a while for large models.")

            snapshot_download(
                repo_id=model_id,
                revision=revision or None,
                local_dir=str(destination),
                repo_type="model",
                token=self._hf_token(),
            )

            cleanup = {"removed_files": 0, "reclaimed_bytes": 0}
            if self.config_manager.get().get("prune_redundant_model_files", True):
                cleanup = self.prune_redundant_model_files(destination)

            message = f"Downloaded to models/{destination.name}."
            if cleanup["removed_files"] > 0:
                message += (
                    f" Removed {cleanup['removed_files']} redundant weight file(s), "
                    f"freed {self._format_bytes(cleanup['reclaimed_bytes'])}."
                )

            self._update_job(
                job_id,
                status="completed",
                message=message,
                removed_files=cleanup["removed_files"],
                reclaimed_bytes=cleanup["reclaimed_bytes"],
                completed_at=time.time(),
            )
        except Exception as error:
            self._update_job(
                job_id,
                status="failed",
                message="Download failed.",
                error=str(error),
                completed_at=time.time(),
            )

    def _update_job(self, job_id: str, **updates: Any) -> None:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return
            for key, value in updates.items():
                setattr(job, key, value)

    def _destination_for(self, folder_name: str) -> Path:
        models_dir = self.config_manager.models_dir().resolve()
        destination = (models_dir / folder_name).resolve()

        try:
            destination.relative_to(models_dir)
        except ValueError as error:
            raise DownloadError("Invalid download folder.") from error

        if destination == models_dir:
            raise DownloadError("Invalid download folder.")

        return destination

    def prune_redundant_model_files(self, model_dir: Path) -> Dict[str, Any]:
        model_dir = Path(model_dir)
        removed: List[str] = []
        reclaimed_bytes = 0

        if not model_dir.exists() or not model_dir.is_dir():
            return {"removed_files": 0, "reclaimed_bytes": 0, "removed_paths": []}

        for folder in [model_dir, *[item for item in model_dir.rglob("*") if item.is_dir()]]:
            if ".cache" in folder.parts:
                continue

            for group in self._weight_groups_for_folder(folder):
                keep = self._preferred_weight_files(group)
                if not keep:
                    continue

                for path in sorted(set().union(*group.values())):
                    if path in keep or not path.exists():
                        continue
                    try:
                        reclaimed_bytes += path.stat().st_size
                        path.unlink()
                        removed.append(str(path))
                    except OSError:
                        pass

        return {
            "removed_files": len(removed),
            "reclaimed_bytes": reclaimed_bytes,
            "removed_paths": removed,
        }

    def prune_all_model_dirs(self) -> Dict[str, Any]:
        models_dir = self.config_manager.models_dir()
        results: Dict[str, Any] = {}
        total_removed = 0
        total_reclaimed = 0

        for folder in sorted(models_dir.iterdir()):
            if not folder.is_dir():
                continue

            result = self.prune_redundant_model_files(folder)
            results[folder.name] = result
            total_removed += int(result["removed_files"])
            total_reclaimed += int(result["reclaimed_bytes"])

        return {
            "success": True,
            "removed_files": total_removed,
            "reclaimed_bytes": total_reclaimed,
            "models": results,
        }

    def _weight_groups_for_folder(self, folder: Path) -> List[Dict[str, Set[Path]]]:
        groups = [
            {
                "safetensors": self._files_for_variant(folder, "diffusion_pytorch_model", "safetensors", False),
                "fp16_safetensors": self._files_for_variant(folder, "diffusion_pytorch_model", "safetensors", True),
                "bin": self._files_for_variant(folder, "diffusion_pytorch_model", "bin", False),
                "fp16_bin": self._files_for_variant(folder, "diffusion_pytorch_model", "bin", True),
            },
            {
                "safetensors": (
                    self._files_for_variant(folder, "model", "safetensors", False)
                    | self._files_for_variant(folder, "pytorch_model", "safetensors", False)
                ),
                "fp16_safetensors": (
                    self._files_for_variant(folder, "model", "safetensors", True)
                    | self._files_for_variant(folder, "pytorch_model", "safetensors", True)
                ),
                "bin": self._files_for_variant(folder, "pytorch_model", "bin", False),
                "fp16_bin": self._files_for_variant(folder, "pytorch_model", "bin", True),
            },
        ]

        return [group for group in groups if sum(len(files) for files in group.values()) > 1]

    def _files_for_variant(self, folder: Path, base_name: str, extension: str, fp16: bool) -> Set[Path]:
        variant = ".fp16" if fp16 else ""
        files: Set[Path] = set()
        names = [
            f"{base_name}{variant}.{extension}",
            f"{base_name}{variant}.{extension}.index.json",
        ]
        if fp16:
            names.append(f"{base_name}.{extension}.index.fp16.json")

        for name in names:
            path = folder / name
            if path.is_file():
                files.add(path)

        shard_pattern = f"{base_name}{variant}-*-of-*.{extension}"
        for path in folder.glob(shard_pattern):
            if path.is_file():
                files.add(path)

        return files

    def _preferred_weight_files(self, group: Dict[str, Set[Path]]) -> Set[Path]:
        for key in ("safetensors", "fp16_safetensors", "bin", "fp16_bin"):
            files = group.get(key) or set()
            if files:
                return files
        return set()

    def _format_bytes(self, value: int) -> str:
        size = float(value)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if size < 1024 or unit == "TB":
                return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} B"
            size /= 1024

    def _validate_model_id(self, model_id: str) -> str:
        cleaned = (model_id or "").strip()
        if not cleaned:
            raise DownloadError("Enter a Hugging Face model ID before downloading.")

        if cleaned.startswith("hf:"):
            cleaned = cleaned[3:].strip()

        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$", cleaned):
            raise DownloadError("Use a Hugging Face model ID like author/model-name.")

        if self.config_manager.get().get("cpu_only_models", True) and self._is_vram_heavy_model(cleaned):
            raise DownloadError(
                "This model is blocked in CPU/RAM-only mode because it usually needs GPU VRAM. "
                "Use BK-SDM Tiny, BK-SDM Small, Stable Diffusion 1.5, or LCM DreamShaper instead."
            )

        return cleaned

    def _is_vram_heavy_model(self, value: str) -> bool:
        lower = (value or "").lower()
        return any(term in lower for term in self.VRAM_HEAVY_MODEL_TERMS)

    def _validate_cpu_only_model_metadata(self, model_id: str) -> None:
        if not self.config_manager.get().get("cpu_only_models", True):
            return

        try:
            from huggingface_hub import HfApi

            info = HfApi().model_info(model_id, token=self._hf_token(), files_metadata=False)
        except Exception:
            return

        tags = [str(tag).lower() for tag in (getattr(info, "tags", None) or [])]
        siblings = [sibling.rfilename for sibling in (getattr(info, "siblings", None) or [])]
        pipeline_tag = str(getattr(info, "pipeline_tag", "") or "").lower()

        if pipeline_tag and pipeline_tag != "text-to-image":
            raise DownloadError("This repo is not a text-to-image Diffusers model.")

        if "model_index.json" not in siblings:
            raise DownloadError("This repo does not look like a full Diffusers pipeline folder.")

        looks_xl = (
            any(name.startswith("text_encoder_2/") for name in siblings)
            or any("xlpipeline" in tag or "stable-diffusion-xl" in tag or "sdxl" in tag for tag in tags)
        )
        if looks_xl or self._is_vram_heavy_model(" ".join([model_id, *tags])):
            raise DownloadError(
                "This model looks GPU/VRAM-heavy. CPU/RAM-only mode blocks FLUX, SDXL, SD3, video, "
                "ControlNet, and similar large pipelines."
            )

    def _safe_folder_name(self, folder_name: str) -> str:
        cleaned = (folder_name or "").strip().replace("\\", "/").split("/")[-1]
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", cleaned).strip(".-")
        if not cleaned:
            raise DownloadError("Download folder name is invalid.")
        if cleaned in {".", ".."}:
            raise DownloadError("Download folder name is invalid.")
        return cleaned[:96]

    def _hf_token(self) -> Optional[str]:
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
        return token.strip() if token else None
