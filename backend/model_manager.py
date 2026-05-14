from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class ResolvedModel:
    id: str
    name: str
    source: str
    path_or_id: str
    local_files_only: bool


class ModelNotFoundError(RuntimeError):
    pass


class ModelManager:
    KNOWN_LOCAL_MODELS = [
        {
            "id": "stable-diffusion-1.5",
            "name": "Stable Diffusion 1.5",
            "folder": "stable-diffusion-1.5",
            "description": "General Stable Diffusion 1.5 compatible Diffusers model.",
        },
        {
            "id": "tiny",
            "name": "Tiny / CPU Test Model",
            "folder": "tiny",
            "description": "Small Diffusers-compatible model for testing CPU generation.",
        },
        {
            "id": "openvino",
            "name": "OpenVINO Model",
            "folder": "openvino",
            "description": "OpenVINO-converted model for Intel CPU/iGPU acceleration.",
        },
    ]

    def __init__(self, config_manager) -> None:
        self.config_manager = config_manager

    def _folder_has_model_files(self, folder: Path) -> bool:
        if not folder.exists() or not folder.is_dir():
            return False

        for item in folder.iterdir():
            if item.name == ".gitkeep":
                continue
            return True
        return False

    def list_models(self) -> Dict[str, Any]:
        config = self.config_manager.get()
        models_dir = self.config_manager.models_dir()
        local_models: List[Dict[str, Any]] = []
        known_ids = set()

        for model in self.KNOWN_LOCAL_MODELS:
            folder = models_dir / model["folder"]
            known_ids.add(model["id"])
            local_models.append({
                "id": model["id"],
                "name": model["name"],
                "path": str(folder),
                "relative_path": f"models/{model['folder']}",
                "available": self._folder_has_model_files(folder),
                "description": model["description"],
                "type": "local",
            })

        for folder in sorted(models_dir.iterdir()):
            if not folder.is_dir() or folder.name in known_ids:
                continue
            local_models.append({
                "id": folder.name,
                "name": folder.name,
                "path": str(folder),
                "relative_path": f"models/{folder.name}",
                "available": self._folder_has_model_files(folder),
                "description": "Local Diffusers-compatible model folder.",
                "type": "local",
            })

        hf_ids = config.get("huggingface_model_ids") or []
        if isinstance(hf_ids, str):
            hf_ids = [hf_ids]

        return {
            "models_dir": str(models_dir),
            "local_models": local_models,
            "huggingface_models": [{"id": model_id, "type": "huggingface"} for model_id in hf_ids if model_id],
            "recommended_downloads": self._recommended_downloads(config),
            "default_model": config.get("default_model", "default"),
        }

    def _recommended_downloads(self, config: Dict[str, Any]) -> List[Dict[str, str]]:
        recommendations = config.get("recommended_model_downloads") or []
        if not isinstance(recommendations, list):
            return []

        cleaned: List[Dict[str, str]] = []
        for item in recommendations:
            if not isinstance(item, dict) or not item.get("id"):
                continue
            cleaned.append({
                "id": str(item.get("id", "")).strip(),
                "name": str(item.get("name") or item.get("id", "")).strip(),
                "folder": str(item.get("folder") or str(item.get("id", "")).replace("/", "--")).strip(),
                "tier": str(item.get("tier") or "Other").strip(),
                "description": str(item.get("description") or "").strip(),
            })

        return cleaned

    def resolve(self, requested_model: str, backend: str) -> ResolvedModel:
        requested = (requested_model or "default").strip()
        model_listing = self.list_models()

        if requested.startswith("hf:"):
            model_id = requested[3:]
            return ResolvedModel(
                id=model_id,
                name=model_id,
                source="huggingface",
                path_or_id=model_id,
                local_files_only=False,
            )

        if requested == "default":
            requested = self._choose_default_model(model_listing, backend)

        for model in model_listing["local_models"]:
            if requested in {model["id"], model["name"], model["relative_path"], model["path"]}:
                if not model["available"]:
                    raise ModelNotFoundError("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.")
                return ResolvedModel(
                    id=model["id"],
                    name=model["name"],
                    source="local",
                    path_or_id=model["path"],
                    local_files_only=True,
                )

        for model in model_listing["huggingface_models"]:
            if requested in {model["id"], f"hf:{model['id']}"}:
                return ResolvedModel(
                    id=model["id"],
                    name=model["id"],
                    source="huggingface",
                    path_or_id=model["id"],
                    local_files_only=False,
                )

        raise ModelNotFoundError("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.")

    def _choose_default_model(self, listing: Dict[str, Any], backend: str) -> str:
        configured = self.config_manager.get().get("default_model", "default")
        if configured and configured != "default":
            return configured

        if backend == "openvino":
            openvino = next((model for model in listing["local_models"] if model["id"] == "openvino" and model["available"]), None)
            if openvino:
                return openvino["id"]

        for preferred in ("stable-diffusion-1.5", "tiny", "openvino"):
            model = next((item for item in listing["local_models"] if item["id"] == preferred and item["available"]), None)
            if model:
                return model["id"]

        hf_models = listing.get("huggingface_models") or []
        if hf_models:
            return f"hf:{hf_models[0]['id']}"

        raise ModelNotFoundError("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.")

    def has_openvino_model(self) -> bool:
        listing = self.list_models()
        return any(model["id"] == "openvino" and model["available"] for model in listing["local_models"])
