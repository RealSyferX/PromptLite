from datetime import datetime
from pathlib import Path
from typing import Any, Dict


def build_output_filename(seed: int) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"promptlite_{timestamp}_{seed}.png"


def save_generated_image(image: Any, outputs_dir: Path, seed: int, metadata: Dict[str, Any]) -> Path:
    from PIL import PngImagePlugin

    outputs_dir.mkdir(parents=True, exist_ok=True)
    path = outputs_dir / build_output_filename(seed)

    png_info = PngImagePlugin.PngInfo()
    for key, value in metadata.items():
        if value is not None:
            png_info.add_text(str(key), str(value))

    image.save(path, format="PNG", pnginfo=png_info)
    return path


def web_output_path(path: Path) -> str:
    return f"/outputs/{path.name}"
