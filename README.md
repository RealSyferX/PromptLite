# PromptLite

A lightweight local or VPS-hosted AI image generator using a simple Node.js web UI and Python backend.

Original author: RealSyferX

PromptLite is built for normal PCs and small servers first: low VRAM systems, CPU-only systems, and beginner-friendly image generation. It does not include model files, does not require a cloud API, and does not send prompts or images to external services unless you configure Hugging Face model downloads yourself.

## Features

- Local text-to-image generation
- Simple browser UI
- CPU mode for systems without a dedicated GPU
- Low VRAM mode
- CUDA mode when available
- Optional OpenVINO mode for supported Intel CPU/iGPU systems
- Recent image gallery
- Model folder support
- VPS/LAN friendly start scripts
- No cloud API required
- No account required

## Why PromptLite?

Many AI image tools are powerful, but they can also feel heavy, crowded, and intimidating. PromptLite focuses on one straightforward workflow: type a prompt, choose a few practical settings, click Generate, and view the image.

The project is local-first and resource-conscious. It prefers simple defaults, clear errors, and CPU-compatible behavior over assuming every user has a large NVIDIA GPU. It can also run on a VPS so you can open the UI from your laptop, phone, or home WiFi.

## Requirements

Minimum:

- Windows 10/11 PC, Windows VPS, or Linux VPS
- Python 3.10 or newer
- Node.js 18 or newer
- 16GB RAM recommended for CPU mode
- More RAM is better for CPU generation
- GPU optional

Recommended:

- 32GB RAM for a better CPU mode experience
- NVIDIA GPU optional for faster CUDA generation
- Intel CPU/iGPU users can try OpenVINO

## Installation on Windows

```bat
git clone https://github.com/USERNAME/PromptLite.git
cd PromptLite
scripts\setup.bat
```

The setup script creates a Python virtual environment, installs Python dependencies, and installs Node.js dependencies.

## Installation on Linux/VPS

```sh
git clone https://github.com/USERNAME/PromptLite.git
cd PromptLite
bash scripts/setup-unix.sh
```

For Ubuntu/Debian VPS machines, install system dependencies first if needed:

```sh
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm git
```

## Running on Windows

```bat
scripts\start-windows.bat
```

Then open:

```text
http://localhost:1234
```

The Node.js UI runs on port `1234` by default. The Python backend runs on port `7861` by default.

## Running on a Windows VPS

```bat
scripts\start-windows-vps.bat YOUR_SERVER_IP
```

Example:

```bat
scripts\start-windows-vps.bat 52.172.248.1
```

Then open:

```text
http://YOUR_SERVER_IP:1234
```

If it does not open from your laptop, run this once as Administrator on the VPS:

```bat
scripts\open-windows-firewall.bat
```

If you previously started the local-only script, restart cleanly:

```bat
scripts\restart-windows-vps.bat YOUR_SERVER_IP
```

To diagnose the exact blocker:

```bat
scripts\diagnose-windows-vps.bat
```

Also open inbound TCP port `1234` in your VPS provider firewall/security group. For Azure, add an inbound NSG rule for TCP `1234`.

## Running on a Linux VPS

```sh
bash scripts/start-vps.sh
```

The Linux VPS start script exposes the Node.js web UI on `0.0.0.0:1234` and keeps the Python backend private on `127.0.0.1:7861`. Open:

```text
http://YOUR_SERVER_IP:1234
```

If your VPS firewall is enabled, allow the UI port:

```sh
sudo ufw allow 1234/tcp
```

You can also copy `.env.example` to `.env` and edit it:

```sh
cp .env.example .env
```

Important: PromptLite does not include login/authentication. If you expose it to the public internet, put it behind a firewall, VPN, SSH tunnel, or reverse proxy with authentication.

## LAN Access From Another Device

On Windows, the default start script is local-only. To let another laptop or phone on the same WiFi open PromptLite, start it with:

```bat
set PROMPTLITE_NODE_HOST=0.0.0.0
scripts\start-windows.bat
```

Then open this from the other device:

```text
http://YOUR_PC_LAN_IP:1234
```

## Server Configuration

These environment variables are useful for VPS, LAN, Docker, or reverse proxy setups:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROMPTLITE_NODE_HOST` | `127.0.0.1` locally, `0.0.0.0` in VPS scripts | Address for the web UI to listen on |
| `PROMPTLITE_NODE_PORT` | `1234` | Web UI port |
| `PROMPTLITE_PYTHON_HOST` | `127.0.0.1` | Address for the Python backend to listen on |
| `PROMPTLITE_PYTHON_PORT` | `7861` | Python backend port |
| `PROMPTLITE_PYTHON_BACKEND_URL` | `http://127.0.0.1:7861` | URL the Node server uses to reach Python |
| `PROMPTLITE_PUBLIC_URL` | empty | Public IP/domain shown in logs and backend docs |
| `PROMPTLITE_CORS_ORIGINS` | local UI origins | Comma-separated allowed browser origins for direct backend access |
| `HF_TOKEN` | empty | Hugging Face token for gated models, higher rate limits, and faster downloads |
| `PROMPTLITE_OUTPUTS_DIR` | `outputs` | Generated image directory |
| `PROMPTLITE_MODELS_DIR` | `models` | Model directory |
| `PROMPTLITE_DISABLE_SAFETY_CHECKER` | `false` | Disable Diffusers safety checker if it replaces outputs with black images |
| `PROMPTLITE_PRUNE_REDUNDANT_MODEL_FILES` | `true` | Remove duplicate `.bin`/`.fp16` weight files after downloads |
| `PROMPTLITE_CPU_ONLY_MODELS` | `true` | Hide/block GPU-VRAM-heavy model recommendations and downloads |
| `PROMPTLITE_DEFAULT_PERFORMANCE_PROFILE` | `full_power` | Default profile; `full_power` uses all detected CPU threads and enables CUDA TF32 where available |

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

- Open the PromptLite UI
- Paste a Hugging Face model ID into `Hugging Face model ID`
- Click `Save Model ID`
- Select the model from the `Model` dropdown

Some models may require accepting licenses from their original authors before they can be downloaded or used.

PromptLite does not automatically download massive models. Downloads only start after you click `Download Model`, or after you explicitly configure/select a Hugging Face model and generate.

## Model Downloader

PromptLite includes a simple browser-based downloader for Hugging Face models.

1. Start PromptLite with the Windows or VPS start script
2. Open the PromptLite UI
3. Choose a tiered model from `Recommended download`, or enter a Hugging Face model ID manually
4. Confirm or edit the `Save folder` name
5. Click `Download Model`

Recommended CPU/RAM model tiers:

| Tier | Catalog size | Best for |
| --- | --- | --- |
| 4GB RAM | 13 models | Tiny/test pipelines, setup checks, and lowest-memory CPU use |
| 8GB RAM | 10 models | Light SD/LCM models at 384-512px |
| 16GB RAM | 14 models | Standard SD1.x-class CPU generation |
| 24GB RAM | 12 models | Heavier SD1.x realistic/anime models |
| 32GB RAM | 13 models | SD2.x and heavier CPU-compatible merges |
| 56GB RAM | 20 models | High-RAM VPS options that still avoid FLUX/SDXL VRAM requirements |

The browser picker includes 82 validated Diffusers text-to-image repos. Each one had a `model_index.json` and was
filtered to avoid obvious GPU/VRAM-first pipelines. By default, PromptLite blocks recommendations and downloads
that are usually GPU/VRAM-heavy, including FLUX, SDXL, SD3, SSD-1B, Kandinsky, Wuerstchen, video pipelines,
ControlNet, inpainting, refiner, and upscaler repos. You can disable `PROMPTLITE_CPU_ONLY_MODELS` in advanced
setups, but those models are not recommended for a Windows VPS without meaningful VRAM.

The backend downloads the model into:

```text
models/<save-folder>/
```

After each download, PromptLite prunes duplicate component weights by default. If a folder has both `.safetensors`,
`.fp16.safetensors`, `.bin`, and `.fp16.bin` copies for the same component, it keeps one preferred file and removes
the rest. Preference order is `.safetensors`, then `.fp16.safetensors`, then `.bin`, then `.fp16.bin`.

When the download finishes, refresh or use `Refresh Models`, then select the downloaded local model.

Large models can take a long time and may use many gigabytes of disk space. PromptLite only starts a download after you click `Download Model`.

Private or gated Hugging Face models may require a token. Login with the Hugging Face CLI or set `HF_TOKEN` before starting PromptLite.

To remove accidentally downloaded GPU-heavy folders from `models`, close the Python backend window first, then run:

```bat
scripts\cleanup-vram-models.bat
```

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
