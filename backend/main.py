from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config_manager import ConfigManager
from .downloader import DownloadError, ModelDownloader
from .generator import BackendUnavailableError, ImageGenerator, PromptLiteError
from .hardware_detect import detect_hardware
from .model_manager import ModelManager, ModelNotFoundError


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 20
    guidance_scale: float = 7.5
    seed: int = -1
    backend: str = "auto"
    model: str = "default"
    performance_profile: str = "balanced"


class SettingsUpdate(BaseModel):
    default_backend: Optional[str] = None
    default_model: Optional[str] = None
    default_width: Optional[int] = None
    default_height: Optional[int] = None
    default_steps: Optional[int] = None
    default_guidance_scale: Optional[float] = None
    default_performance_profile: Optional[str] = None
    unload_model_after_generation: Optional[bool] = None
    huggingface_model_ids: Optional[list[str]] = None


class DownloadModelRequest(BaseModel):
    model_id: str = Field(..., min_length=1)
    folder_name: Optional[str] = None
    revision: Optional[str] = None


config_manager = ConfigManager()
model_manager = ModelManager(config_manager)
image_generator = ImageGenerator(config_manager, model_manager)
model_downloader = ModelDownloader(config_manager)

app = FastAPI(
    title="PromptLite Backend",
    description="Local FastAPI backend for PromptLite image generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:1234",
        "http://localhost:1234",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_response(status_code: int, error: str, details: Optional[str] = None) -> HTTPException:
    payload: Dict[str, Any] = {"success": False, "error": error}
    if details:
        payload["details"] = details
    return HTTPException(status_code=status_code, detail=payload)


def model_to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    from fastapi.responses import JSONResponse

    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": str(exc.detail)})


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "success": True,
        "service": "PromptLite Python backend",
        "message": "This is the Python backend. Open the PromptLite web UI at http://localhost:1234.",
        "ui_url": "http://localhost:1234",
        "health_url": "/health",
        "docs_url": "/docs",
    }


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/health")
def health() -> Dict[str, Any]:
    settings = config_manager.get()
    return {
        "success": True,
        "status": "ok",
        "selected_backend": settings.get("default_backend", "auto"),
        **image_generator.status(),
    }


@app.get("/hardware")
def hardware() -> Dict[str, Any]:
    settings = config_manager.get()
    return {
        "success": True,
        **detect_hardware(settings.get("default_backend", "auto")),
    }


@app.get("/models")
def models() -> Dict[str, Any]:
    return {
        "success": True,
        **model_manager.list_models(),
    }


@app.get("/downloads")
def downloads() -> Dict[str, Any]:
    return model_downloader.list_jobs()


@app.get("/download/{job_id}")
def download_status(job_id: str) -> Dict[str, Any]:
    try:
        return model_downloader.get_job(job_id)
    except DownloadError as error:
        raise error_response(404, str(error))


@app.post("/download")
def download_model(request: DownloadModelRequest) -> Dict[str, Any]:
    try:
        return model_downloader.start_download(
            model_id=request.model_id,
            folder_name=request.folder_name,
            revision=request.revision,
        )
    except DownloadError as error:
        raise error_response(400, str(error))


@app.post("/generate")
def generate(request: GenerateRequest) -> Dict[str, Any]:
    try:
        return image_generator.generate(model_to_dict(request))
    except ModelNotFoundError as error:
        raise error_response(400, str(error))
    except BackendUnavailableError as error:
        raise error_response(400, str(error))
    except PromptLiteError as error:
        raise error_response(500, str(error))
    except Exception as error:
        raise error_response(500, "Generation failed unexpectedly.", str(error))


@app.post("/unload")
def unload() -> Dict[str, Any]:
    return image_generator.unload()


@app.get("/settings")
def get_settings() -> Dict[str, Any]:
    return {
        "success": True,
        **config_manager.get(),
    }


@app.post("/settings")
def save_settings(settings: SettingsUpdate) -> Dict[str, Any]:
    updates = {key: value for key, value in model_to_dict(settings).items() if value is not None}
    updated = config_manager.save_settings(updates)
    image_generator.refresh_config()
    return {
        "success": True,
        **updated,
    }
