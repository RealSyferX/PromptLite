# PromptLite

A lightweight local AI image generator for Windows using a simple Node.js web UI and Python backend.

Original author: RealSyferX

PromptLite is built for normal Windows PCs first: low VRAM systems, CPU-only systems, and beginner-friendly local image generation. It does not include model files, does not require a cloud API, and does not send prompts or images to external services.

## Features

- Local text-to-image generation
- Simple browser UI
- CPU mode for systems without a dedicated GPU
- Low VRAM mode
- CUDA mode when available
- Optional OpenVINO mode for supported Intel CPU/iGPU systems
- Recent image gallery
- Model folder support
- No cloud API required
- No account required

## Why PromptLite?

Many AI image tools are powerful, but they can also feel heavy, crowded, and intimidating. PromptLite focuses on one straightforward workflow: type a prompt, choose a few practical settings, click Generate, and view the image.

The project is local-first and resource-conscious. It prefers simple defaults, clear errors, and CPU-compatible behavior over assuming every user has a large NVIDIA GPU.

## Requirements

Minimum:

- Windows 10 or Windows 11
- Python 3.10 or newer
- Node.js 18 or newer
- 16GB RAM recommended for CPU mode
- More RAM is better for CPU generation
- GPU optional

Recommended:

- 32GB RAM for a better CPU mode experience
- NVIDIA GPU optional for faster CUDA generation
- Intel CPU/iGPU users can try OpenVINO

## Installation

```bat
git clone https://github.com/USERNAME/PromptLite.git
cd PromptLite
scripts\setup.bat
```

The setup script creates a Python virtual environment, installs Python dependencies, and installs Node.js dependencies.

## Running

```bat
scripts\start-windows.bat
```

Then open:

```text
http://localhost:1234
```

The Node.js UI runs on port `1234` by default. The Python backend runs on port `7861` by default.

## Model Setup

Models are not included in this repository.

Place local Diffusers-compatible models inside the `models` folder. Examples:

```text
models/stable-diffusion-1.5/
models/tiny/
models/openvino/
```

The default local model locations are:

- `models/stable-diffusion-1.5/` for a Stable Diffusion 1.5 compatible model
- `models/tiny/` for a tiny or lightweight diffusion model used for CPU testing
- `models/openvino/` for an OpenVINO-converted model

You can also configure Hugging Face model IDs in `config/default-config.json` or in `config/user-settings.json`:

```json
{
  "huggingface_model_ids": [
    "example-author/example-model"
  ]
}
```

You can also use the browser UI:

- Open `http://localhost:1234`
- Paste a Hugging Face model ID into `Hugging Face model ID`
- Click `Save Model ID`
- Select the model from the `Model` dropdown

Some models may require accepting licenses from their original authors before they can be downloaded or used.

PromptLite does not automatically download massive models. Downloads only start after you click `Download Model`, or after you explicitly configure/select a Hugging Face model and generate.

## Model Downloader

PromptLite includes a simple browser-based downloader for Hugging Face models.

1. Start PromptLite with `scripts\start-windows.bat`
2. Open `http://localhost:1234`
3. Choose a tiered model from `Recommended download`, or enter a Hugging Face model ID manually
4. Confirm or edit the `Save folder` name
5. Click `Download Model`

Recommended model tiers:

| Tier | Model | Best for |
| --- | --- | --- |
| Lowest | `nota-ai/bk-sdm-tiny` | Very weak PCs, CPU testing, lowest quality |
| Low | `nota-ai/bk-sdm-small` | First real lightweight download |
| Mid-End | `stable-diffusion-v1-5/stable-diffusion-v1-5` | Classic 512x512 generation |
| Mid-End | `SimianLuo/LCM_Dreamshaper_v7` | Fast low-step generation |
| HighEnd | `segmind/SSD-1B` | Better quality compact SDXL-style generation |
| Powerful | `stabilityai/stable-diffusion-xl-base-1.0` | Strong GPUs and high-quality SDXL output |

The backend downloads the model into:

```text
models/<save-folder>/
```

When the download finishes, refresh or use `Refresh Models`, then select the downloaded local model.

Large models can take a long time and may use many gigabytes of disk space. PromptLite only starts a download after you click `Download Model`.

Private or gated Hugging Face models may require a token. Login with the Hugging Face CLI or set `HF_TOKEN` before starting PromptLite.

## Low VRAM / CPU Mode Notes

CPU generation is slow, but it works without dedicated VRAM when the system has enough RAM.

For weak machines:

- Use the `Low RAM` profile
- Use smaller image sizes like `384x384`
- Use fewer steps like `10`
- Expect generation to take minutes on CPU, depending on hardware

When CPU mode is selected, PromptLite shows:

```text
CPU generation can be slow. Use smaller resolution and fewer steps for faster results.
```

## Backend Notes

- `Auto` prefers CUDA when available, then OpenVINO when installed and configured, then CPU.
- `CUDA` is fastest when a supported NVIDIA GPU and PyTorch CUDA build are available.
- `CPU` is the most compatible mode and uses float32.
- `OpenVINO` is optional and useful for some Intel CPU/iGPU systems.
- DirectML support for AMD/Intel Windows GPUs may be added later.

PromptLite uses memory-friendly generation options when supported:

- Attention slicing
- VAE slicing
- Optional model CPU offload through `accelerate`
- Float16 on CUDA where safe
- Float32 on CPU for compatibility
- One loaded model at a time
- Manual model unload endpoint

## Python Dependency Note

`backend/requirements.txt` includes `torch`, but it does not force CUDA-specific PyTorch wheels.

If you want a specific PyTorch build for your hardware, install it inside `backend\.venv` using the command recommended by PyTorch for your system, then run:

```bat
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Optional OpenVINO dependencies:

```bat
backend\.venv\Scripts\python.exe -m pip install optimum-intel openvino
```

Optional DirectML experimentation:

```bat
backend\.venv\Scripts\python.exe -m pip install torch-directml
```

DirectML is detected for informational purposes, but it is not yet exposed as a supported generation backend.

## API

Python FastAPI backend:

- `GET /health`
- `GET /hardware`
- `GET /models`
- `GET /downloads`
- `GET /download/{job_id}`
- `POST /download`
- `POST /generate`
- `POST /unload`
- `GET /settings`
- `POST /settings`

Node.js proxy routes:

- `GET /api/health`
- `GET /api/hardware`
- `GET /api/models`
- `GET /api/downloads`
- `GET /api/download/:jobId`
- `POST /api/download`
- `POST /api/generate`
- `POST /api/unload`
- `GET /api/settings`
- `POST /api/settings`

## Roadmap

- DirectML backend for AMD/Intel Windows GPUs
- One-click installer
- Portable ZIP release
- Image-to-image mode
- Prompt history
- File-level downloader progress
- NSFW safety toggle option
- Queue system
- Progress preview
- Upscaler support
- System tray mode

## License

MIT License.

Original author: RealSyferX
