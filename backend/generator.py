import gc
import importlib.util
import os
import random
import sys
import time
import types
from dataclasses import dataclass
from pathlib import Path
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
    performance_profile: str
    disable_safety_checker: bool


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
        settings = self.config_manager.get()
        return {
            "model_loaded": self.loaded is not None,
            "loaded_backend": self.loaded.backend if self.loaded else None,
            "loaded_model": self.loaded.model.name if self.loaded else None,
            "loaded_model_source": self.loaded.model.source if self.loaded else None,
            "loaded_model_location": self.loaded.model.path_or_id if self.loaded else None,
            "disable_safety_checker": bool(settings.get("disable_safety_checker", False)),
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
        performance_profile = (request.get("performance_profile") or "full_power").lower()

        self._validate_generation_settings(width, height, steps, guidance_scale)
        self._configure_runtime_for_generation(performance_profile)

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
            "model_source": model.source,
            "model_location": model.path_or_id,
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
        disable_safety_checker = bool(self.config_manager.get().get("disable_safety_checker", False))
        if (
            self.loaded
            and self.loaded.backend == backend
            and self.loaded.model.path_or_id == model.path_or_id
            and self.loaded.performance_profile == performance_profile
            and self.loaded.disable_safety_checker == disable_safety_checker
        ):
            return self.loaded.pipe

        self.unload()
        pipe = self._load_pipeline(model, backend, performance_profile)
        self.loaded = LoadedPipeline(
            pipe=pipe,
            backend=backend,
            model=model,
            performance_profile=performance_profile,
            disable_safety_checker=disable_safety_checker,
        )
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

        single_file_path = self._single_safetensors_path(model)
        if self._is_flux2_model(model) and single_file_path:
            pipe = self._load_flux2_klein_single_file_pipeline(model, single_file_path, backend, torch)
            return self._finalize_loaded_pipe(pipe, backend, performance_profile)

        if self._is_wuerstchen(model):
            self._prepare_wuerstchen_compat()
            from diffusers import WuerstchenCombinedPipeline as PipelineClass
        elif self._is_kandinsky_21(model):
            from diffusers import AutoPipelineForText2Image as PipelineClass
        else:
            from diffusers import DiffusionPipeline as PipelineClass

        if backend == "cuda" and self._is_flux_model(model):
            torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        else:
            torch_dtype = torch.float16 if backend == "cuda" else torch.float32

        load_kwargs = {
            "torch_dtype": torch_dtype,
            "local_files_only": model.local_files_only,
        }
        hf_token = self._hf_token()
        if hf_token:
            load_kwargs["token"] = hf_token
        if self._is_wuerstchen(model) and model.source == "local":
            # Wuerstchen decoder repos reference a connected prior in the model card.
            # Let Diffusers fetch/cache that prior on first load even when the decoder is local.
            load_kwargs["local_files_only"] = False
        if self._is_kandinsky_21(model):
            load_kwargs["use_safetensors"] = True

        try:
            pipe = PipelineClass.from_pretrained(model.path_or_id, **load_kwargs)
        except OSError as error:
            if model.source == "huggingface":
                raise ModelNotFoundError(f"Could not load Hugging Face model '{model.id}'. Check the model ID, license access, and internet connection.") from error
            raise ModelNotFoundError("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.") from error
        except Exception as error:
            if self._is_wuerstchen(model):
                raise PromptLiteError(
                    "Could not load Wuerstchen. It needs the connected prior model on first load; keep internet "
                    "enabled and set HF_TOKEN, then generate again. Diffusers error: "
                    f"{error}"
                ) from error
            raise PromptLiteError(f"Could not load model: {error}") from error

        return self._finalize_loaded_pipe(pipe, backend, performance_profile)

    def _load_flux2_klein_single_file_pipeline(self, model: ResolvedModel, checkpoint_path: Path, backend: str, torch: Any) -> Any:
        if not _module_available("transformers"):
            raise BackendUnavailableError("FLUX.2 requires transformers. Run scripts\\install-python-deps.bat first.")

        from diffusers import Flux2KleinPipeline, Flux2Transformer2DModel

        if backend == "cuda":
            torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        else:
            torch_dtype = torch.float32

        hf_token = self._hf_token()
        base_repo = self._flux2_klein_base_repo(model, checkpoint_path)
        shared_kwargs = {
            "torch_dtype": torch_dtype,
            "token": hf_token,
            "local_files_only": False,
        }
        if hf_token is None:
            shared_kwargs.pop("token")

        try:
            transformer = Flux2Transformer2DModel.from_single_file(
                str(checkpoint_path),
                config=base_repo,
                subfolder="transformer",
                **shared_kwargs,
            )
            return Flux2KleinPipeline.from_pretrained(
                base_repo,
                transformer=transformer,
                ignore_patterns=[
                    "*.jpg",
                    "flux-2-klein-*.safetensors",
                    "transformer/diffusion_pytorch_model*.safetensors",
                    "transformer/diffusion_pytorch_model*.bin",
                ],
                **shared_kwargs,
            )
        except Exception as error:
            raise PromptLiteError(
                "Could not load this FLUX.2 single-file checkpoint. PromptLite will use it as the transformer, "
                f"but Diffusers must download the matching pipeline files from {base_repo} on first load. "
                "Keep internet enabled and set HF_TOKEN if the repo needs access. Diffusers error: "
                f"{error}"
            ) from error

    def _finalize_loaded_pipe(self, pipe: Any, backend: str, performance_profile: str) -> Any:
        if self.config_manager.get().get("disable_safety_checker", False):
            self._disable_safety_checker(pipe)

        if performance_profile != "full_power":
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

    def _configure_runtime_for_generation(self, performance_profile: str) -> None:
        if performance_profile != "full_power":
            return

        workers = max(1, os.cpu_count() or 1)
        for env_name in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
            os.environ[env_name] = str(workers)

        if not _module_available("torch"):
            return

        try:
            import torch

            torch.set_num_threads(workers)
            try:
                torch.set_num_interop_threads(workers)
            except RuntimeError:
                pass

            if torch.cuda.is_available():
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                torch.backends.cudnn.benchmark = True
        except Exception:
            pass

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

    def _disable_safety_checker(self, pipe: Any) -> None:
        if hasattr(pipe, "safety_checker"):
            pipe.safety_checker = None
        if hasattr(pipe, "requires_safety_checker"):
            pipe.requires_safety_checker = False
        register_to_config = getattr(pipe, "register_to_config", None)
        if callable(register_to_config):
            try:
                register_to_config(requires_safety_checker=False)
            except Exception:
                pass

    def _model_key(self, model: Optional[ResolvedModel] = None) -> str:
        selected = model or (self.loaded.model if self.loaded else None)
        if not selected:
            return ""
        return f"{selected.id} {selected.name} {selected.path_or_id}".lower()

    def _is_flux_model(self, model: ResolvedModel) -> bool:
        key = self._model_key(model)
        return "flux." in key or "flux2" in key or "flux-2" in key

    def _is_flux_schnell(self, model: Optional[ResolvedModel] = None) -> bool:
        key = self._model_key(model)
        return "flux.1-schnell" in key

    def _is_flux2_model(self, model: Optional[ResolvedModel] = None) -> bool:
        key = self._model_key(model)
        return "flux.2" in key or "flux2" in key or "flux-2" in key

    def _is_kandinsky_21(self, model: Optional[ResolvedModel] = None) -> bool:
        key = self._model_key(model)
        return "kandinsky-2-1" in key

    def _is_wuerstchen(self, model: Optional[ResolvedModel] = None) -> bool:
        key = self._model_key(model)
        return "wuerstchen" in key

    def _prepare_wuerstchen_compat(self) -> None:
        if "wuerstchen" in sys.modules:
            return

        import diffusers
        from diffusers.pipelines.deprecated.wuerstchen import (
            PaellaVQModel,
            WuerstchenDiffNeXt,
            WuerstchenPrior,
        )

        module = types.ModuleType("wuerstchen")
        module.WuerstchenDiffNeXt = WuerstchenDiffNeXt
        module.PaellaVQModel = PaellaVQModel
        module.WuerstchenPrior = WuerstchenPrior
        module.ModelMixin = diffusers.ModelMixin
        module.SchedulerMixin = diffusers.SchedulerMixin
        module.DiffusionPipeline = diffusers.DiffusionPipeline
        module.OnnxRuntimeModel = getattr(diffusers, "OnnxRuntimeModel", None)
        module.BaseGuidance = getattr(diffusers, "BaseGuidance", None)
        sys.modules["wuerstchen"] = module

    def _single_safetensors_path(self, model: ResolvedModel) -> Optional[Path]:
        if model.source != "local":
            return None

        path = Path(model.path_or_id)
        if path.is_file() and path.suffix == ".safetensors":
            return path
        if not path.is_dir() or (path / "model_index.json").exists():
            return None

        candidates = sorted(item for item in path.glob("*.safetensors") if item.is_file())
        if len(candidates) == 1:
            return candidates[0]
        return None

    def _flux2_klein_base_repo(self, model: ResolvedModel, checkpoint_path: Path) -> str:
        key = f"{self._model_key(model)} {checkpoint_path.name}".lower()
        if "base" in key and "9b" in key:
            return "black-forest-labs/FLUX.2-klein-base-9B"
        if "base" in key and "4b" in key:
            return "black-forest-labs/FLUX.2-klein-base-4B"
        if "9b" in key:
            return "black-forest-labs/FLUX.2-klein-9B"
        return "black-forest-labs/FLUX.2-klein-4B"

    def _hf_token(self) -> Optional[str]:
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
        return token.strip() if token else None

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

        if self._is_flux_schnell():
            kwargs.pop("negative_prompt", None)
            kwargs["guidance_scale"] = 0.0
            kwargs["num_inference_steps"] = min(steps, 4)
            kwargs["max_sequence_length"] = 256

        if self._is_flux2_model():
            kwargs.pop("negative_prompt", None)
            kwargs["max_sequence_length"] = 512

        if self._is_kandinsky_21():
            kwargs["prior_guidance_scale"] = 1.0

        if self._is_wuerstchen():
            kwargs["prior_num_inference_steps"] = max(20, min(steps * 3, 60))
            kwargs["num_inference_steps"] = max(8, min(steps, 16))
            kwargs["prior_guidance_scale"] = 4.0
            kwargs["decoder_guidance_scale"] = 0.0

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
