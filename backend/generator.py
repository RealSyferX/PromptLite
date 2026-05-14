import gc
import importlib.util
import random
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .hardware_detect import detect_hardware
from .image_utils import save_generated_image, web_output_path
from .model_manager import ModelManager, ModelNotFoundError, ResolvedModel


class PromptLiteError(RuntimeError):
    pass


class BackendUnavailableError(PromptLiteError):
    pass


@dataclass
class LoadedPipeline:
    pipe: Any
    backend: str
    model: ResolvedModel


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


class ImageGenerator:
    def __init__(self, config_manager, model_manager: ModelManager) -> None:
        self.config_manager = config_manager
        self.model_manager = model_manager
        self.loaded: Optional[LoadedPipeline] = None

    def refresh_config(self) -> None:
        self.config_manager.load()

    def status(self) -> Dict[str, Any]:
        return {
            "model_loaded": self.loaded is not None,
            "loaded_backend": self.loaded.backend if self.loaded else None,
            "loaded_model": self.loaded.model.name if self.loaded else None,
        }

    def unload(self) -> Dict[str, Any]:
        self.loaded = None
        gc.collect()

        if _module_available("torch"):
            try:
                import torch

                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass

        return {"success": True, "message": "Model unloaded."}

    def choose_backend(self, requested_backend: str) -> str:
        requested = (requested_backend or "auto").lower()
        hardware = detect_hardware(requested)

        if requested == "auto":
            if hardware["cuda_available"]:
                return "cuda"
            if hardware["openvino_available"] and self.model_manager.has_openvino_model():
                return "openvino"
            return "cpu"

        if requested == "cuda":
            if not hardware["cuda_available"]:
                raise BackendUnavailableError("CUDA was selected, but no CUDA-capable PyTorch GPU is available.")
            return "cuda"

        if requested == "openvino":
            if not hardware["openvino_available"]:
                raise BackendUnavailableError("OpenVINO mode requires optimum-intel and openvino. Install them with: pip install optimum-intel openvino")
            return "openvino"

        if requested == "cpu":
            return "cpu"

        raise BackendUnavailableError(f"Unsupported backend mode: {requested_backend}")

    def generate(self, request: Dict[str, Any]) -> Dict[str, Any]:
        prompt = (request.get("prompt") or "").strip()
        if not prompt:
            raise PromptLiteError("Prompt is required.")

        width = int(request.get("width") or 512)
        height = int(request.get("height") or 512)
        steps = int(request.get("steps") or 20)
        guidance_scale = float(request.get("guidance_scale") or 7.5)
        performance_profile = (request.get("performance_profile") or "balanced").lower()

        self._validate_generation_settings(width, height, steps, guidance_scale)

        backend = self.choose_backend(request.get("backend", "auto"))
        model = self.model_manager.resolve(request.get("model", "default"), backend)
        pipe = self._get_or_load_pipeline(model, backend, performance_profile)

        seed = int(request.get("seed", -1))
        if seed < 0:
            seed = random.randint(0, 2**32 - 1)

        if backend == "cpu":
            cpu_message = "CPU generation can be slow. Use smaller resolution and fewer steps for faster results."
        else:
            cpu_message = None

        started = time.perf_counter()
        image = self._run_pipeline(pipe, request, seed, backend, width, height, steps, guidance_scale)
        elapsed = time.perf_counter() - started

        outputs_dir = self.config_manager.outputs_dir()
        image_path = save_generated_image(
            image,
            outputs_dir,
            seed,
            {
                "prompt": prompt,
                "negative_prompt": request.get("negative_prompt") or "",
                "seed": seed,
                "backend": backend,
                "model": model.name,
                "width": width,
                "height": height,
                "steps": steps,
                "guidance_scale": guidance_scale,
            },
        )

        if self.config_manager.get().get("unload_model_after_generation", False) or performance_profile == "low_ram_unload":
            self.unload()
        else:
            gc.collect()

        return {
            "success": True,
            "image": web_output_path(image_path),
            "seed": seed,
            "backend_used": backend,
            "model_used": model.name,
            "generation_time_seconds": round(elapsed, 2),
            "message": cpu_message,
        }

    def _validate_generation_settings(self, width: int, height: int, steps: int, guidance_scale: float) -> None:
        if width % 8 != 0 or height % 8 != 0:
            raise PromptLiteError("Width and height must be divisible by 8.")
        if width < 128 or height < 128 or width > 1024 or height > 1024:
            raise PromptLiteError("Width and height must be between 128 and 1024.")
        if steps < 1 or steps > 100:
            raise PromptLiteError("Steps must be between 1 and 100.")
        if guidance_scale < 1 or guidance_scale > 30:
            raise PromptLiteError("Guidance scale must be between 1 and 30.")

    def _get_or_load_pipeline(self, model: ResolvedModel, backend: str, performance_profile: str) -> Any:
        if self.loaded and self.loaded.backend == backend and self.loaded.model.path_or_id == model.path_or_id:
            return self.loaded.pipe

        self.unload()
        pipe = self._load_pipeline(model, backend, performance_profile)
        self.loaded = LoadedPipeline(pipe=pipe, backend=backend, model=model)
        return pipe

    def _load_pipeline(self, model: ResolvedModel, backend: str, performance_profile: str) -> Any:
        if backend == "openvino":
            return self._load_openvino_pipeline(model)
        return self._load_diffusers_pipeline(model, backend, performance_profile)

    def _load_diffusers_pipeline(self, model: ResolvedModel, backend: str, performance_profile: str) -> Any:
        if not _module_available("torch"):
            raise BackendUnavailableError("PyTorch is not installed. Run scripts\\install-python-deps.bat first.")
        if not _module_available("diffusers"):
            raise BackendUnavailableError("Diffusers is not installed. Run scripts\\install-python-deps.bat first.")

        import torch
        from diffusers import DiffusionPipeline

        torch_dtype = torch.float16 if backend == "cuda" else torch.float32

        try:
            pipe = DiffusionPipeline.from_pretrained(
                model.path_or_id,
                torch_dtype=torch_dtype,
                local_files_only=model.local_files_only,
            )
        except OSError as error:
            if model.source == "huggingface":
                raise ModelNotFoundError(f"Could not load Hugging Face model '{model.id}'. Check the model ID, license access, and internet connection.") from error
            raise ModelNotFoundError("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.") from error
        except Exception as error:
            raise PromptLiteError(f"Could not load model: {error}") from error

        self._enable_memory_savers(pipe)

        if backend == "cuda":
            try:
                if performance_profile == "low_ram" and hasattr(pipe, "enable_model_cpu_offload") and _module_available("accelerate"):
                    pipe.enable_model_cpu_offload()
                else:
                    pipe.to("cuda")
            except RuntimeError as error:
                if "out of memory" in str(error).lower():
                    raise BackendUnavailableError("CUDA ran out of memory while loading the model. Try CPU mode, Low RAM profile, or a smaller model.") from error
                raise
        else:
            pipe.to("cpu")

        return pipe

    def _load_openvino_pipeline(self, model: ResolvedModel) -> Any:
        if not (_module_available("openvino") and _module_available("optimum.intel")):
            raise BackendUnavailableError("OpenVINO mode requires optimum-intel and openvino. Install them with: pip install optimum-intel openvino")

        try:
            from optimum.intel import OVStableDiffusionPipeline

            pipe = OVStableDiffusionPipeline.from_pretrained(
                model.path_or_id,
                local_files_only=model.local_files_only,
                compile=False,
            )
            return pipe
        except Exception as error:
            raise PromptLiteError(f"Could not load OpenVINO model: {error}") from error

    def _enable_memory_savers(self, pipe: Any) -> None:
        for method_name in ("enable_attention_slicing", "enable_vae_slicing"):
            method = getattr(pipe, method_name, None)
            if callable(method):
                try:
                    method()
                except Exception:
                    pass

    def _run_pipeline(
        self,
        pipe: Any,
        request: Dict[str, Any],
        seed: int,
        backend: str,
        width: int,
        height: int,
        steps: int,
        guidance_scale: float,
    ) -> Any:
        prompt = request["prompt"].strip()
        negative_prompt = (request.get("negative_prompt") or "").strip() or None

        kwargs = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "width": width,
            "height": height,
            "num_inference_steps": steps,
            "guidance_scale": guidance_scale,
        }

        if backend == "openvino":
            try:
                import numpy as np

                np.random.seed(seed)
            except Exception:
                pass
        else:
            import torch

            generator_device = "cuda" if backend == "cuda" else "cpu"
            kwargs["generator"] = torch.Generator(device=generator_device).manual_seed(seed)

        try:
            result = pipe(**kwargs)
        except RuntimeError as error:
            message = str(error).lower()
            if "out of memory" in message or "allocation" in message:
                raise PromptLiteError("Generation ran out of memory. Try Low RAM profile, smaller image size, fewer steps, or CPU mode.") from error
            raise PromptLiteError(f"Generation failed: {error}") from error
        except Exception as error:
            raise PromptLiteError(f"Generation failed: {error}") from error

        if not getattr(result, "images", None):
            raise PromptLiteError("Generation finished but did not return an image.")

        return result.images[0]
