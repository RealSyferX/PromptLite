import importlib.util
import platform
from typing import Any, Dict, Optional

import psutil


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def _torch_info() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        "torch_available": False,
        "cuda_available": False,
        "cuda_gpu_name": None,
        "cuda_vram_gb": None,
    }

    if not _module_available("torch"):
        return info

    try:
        import torch

        info["torch_available"] = True
        info["torch_version"] = getattr(torch, "__version__", None)
        info["cuda_available"] = bool(torch.cuda.is_available())

        if info["cuda_available"]:
            device_index = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(device_index)
            info["cuda_gpu_name"] = torch.cuda.get_device_name(device_index)
            info["cuda_vram_gb"] = round(props.total_memory / (1024 ** 3), 2)
    except Exception as error:
        info["torch_error"] = str(error)

    return info


def detect_hardware(selected_backend: Optional[str] = None) -> Dict[str, Any]:
    memory = psutil.virtual_memory()
    cpu_freq = psutil.cpu_freq()
    torch_info = _torch_info()

    return {
        "os": f"{platform.system()} {platform.release()}",
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu": platform.processor() or platform.machine(),
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "cpu_cores_logical": psutil.cpu_count(logical=True),
        "cpu_frequency_mhz": round(cpu_freq.current, 1) if cpu_freq else None,
        "ram_gb": round(memory.total / (1024 ** 3), 2),
        "cuda_available": torch_info.get("cuda_available", False),
        "cuda_gpu_name": torch_info.get("cuda_gpu_name"),
        "cuda_vram_gb": torch_info.get("cuda_vram_gb"),
        "torch_available": torch_info.get("torch_available", False),
        "torch_version": torch_info.get("torch_version"),
        "openvino_available": _module_available("openvino") and _module_available("optimum.intel"),
        "directml_available": _module_available("torch_directml"),
        "selected_backend_mode": selected_backend or "auto",
    }

