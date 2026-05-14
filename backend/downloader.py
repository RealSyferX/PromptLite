import re
import threading
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional


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


class ModelDownloader:
    """Downloads Hugging Face model snapshots into the local models folder."""

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
            )

            self._update_job(
                job_id,
                status="completed",
                message=f"Downloaded to models/{destination.name}.",
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

    def _validate_model_id(self, model_id: str) -> str:
        cleaned = (model_id or "").strip()
        if not cleaned:
            raise DownloadError("Enter a Hugging Face model ID before downloading.")

        if cleaned.startswith("hf:"):
            cleaned = cleaned[3:].strip()

        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$", cleaned):
            raise DownloadError("Use a Hugging Face model ID like author/model-name.")

        return cleaned

    def _safe_folder_name(self, folder_name: str) -> str:
        cleaned = (folder_name or "").strip().replace("\\", "/").split("/")[-1]
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", cleaned).strip(".-")
        if not cleaned:
            raise DownloadError("Download folder name is invalid.")
        if cleaned in {".", ".."}:
            raise DownloadError("Download folder name is invalid.")
        return cleaned[:96]
