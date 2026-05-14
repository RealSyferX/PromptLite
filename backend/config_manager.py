import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict


class ConfigManager:
    """Reads default config, local user settings, and environment overrides."""

    ENV_MAP = {
        "PROMPTLITE_NODE_PORT": ("node_port", int),
        "PROMPTLITE_PYTHON_PORT": ("python_port", int),
        "PROMPTLITE_PYTHON_BACKEND_URL": ("python_backend_url", str),
        "PROMPTLITE_OUTPUTS_DIR": ("outputs_dir", str),
        "PROMPTLITE_MODELS_DIR": ("models_dir", str),
        "PROMPTLITE_DEFAULT_BACKEND": ("default_backend", str),
        "PROMPTLITE_DEFAULT_MODEL": ("default_model", str),
        "PROMPTLITE_DEFAULT_WIDTH": ("default_width", int),
        "PROMPTLITE_DEFAULT_HEIGHT": ("default_height", int),
        "PROMPTLITE_DEFAULT_STEPS": ("default_steps", int),
        "PROMPTLITE_DEFAULT_GUIDANCE_SCALE": ("default_guidance_scale", float),
        "PROMPTLITE_DEFAULT_PERFORMANCE_PROFILE": ("default_performance_profile", str),
        "PROMPTLITE_UNLOAD_MODEL_AFTER_GENERATION": ("unload_model_after_generation", lambda value: value.lower() in {"1", "true", "yes", "on"}),
        "PROMPTLITE_HF_MODEL_IDS": ("huggingface_model_ids", lambda value: [item.strip() for item in value.split(",") if item.strip()]),
    }

    WRITABLE_KEYS = {
        "default_backend",
        "default_model",
        "default_width",
        "default_height",
        "default_steps",
        "default_guidance_scale",
        "default_performance_profile",
        "unload_model_after_generation",
        "huggingface_model_ids",
    }

    def __init__(self) -> None:
        self.project_root = Path(__file__).resolve().parents[1]
        self.config_dir = self.project_root / "config"
        self.default_config_path = self.config_dir / "default-config.json"
        self.user_settings_path = self.config_dir / "user-settings.json"
        self._config = self.load()

    def load(self) -> Dict[str, Any]:
        config: Dict[str, Any] = {}

        if self.default_config_path.exists():
            config.update(json.loads(self.default_config_path.read_text(encoding="utf-8")))

        if self.user_settings_path.exists():
            config.update(json.loads(self.user_settings_path.read_text(encoding="utf-8")))

        for env_name, (key, parser) in self.ENV_MAP.items():
            raw_value = os.getenv(env_name)
            if raw_value is None or raw_value == "":
                continue
            try:
                config[key] = parser(raw_value)
            except Exception:
                config[key] = raw_value

        self._config = config
        return deepcopy(config)

    def get(self) -> Dict[str, Any]:
        return deepcopy(self._config)

    def path_from_config(self, key: str, default: str) -> Path:
        value = self._config.get(key, default)
        path = Path(value)
        if not path.is_absolute():
            path = self.project_root / path
        return path

    def outputs_dir(self) -> Path:
        path = self.path_from_config("outputs_dir", "outputs")
        path.mkdir(parents=True, exist_ok=True)
        return path

    def models_dir(self) -> Path:
        path = self.path_from_config("models_dir", "models")
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        existing: Dict[str, Any] = {}
        if self.user_settings_path.exists():
            existing = json.loads(self.user_settings_path.read_text(encoding="utf-8"))

        for key, value in updates.items():
            if key in self.WRITABLE_KEYS:
                existing[key] = value

        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.user_settings_path.write_text(json.dumps(existing, indent=2), encoding="utf-8")
        return self.load()

