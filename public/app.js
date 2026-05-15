const state = {
  settings: null,
  models: [],
  recommendedDownloads: [],
  generating: false,
  generationProgressTimer: null,
  generationProgressHideTimer: null,
  generationProgressValue: 0,
  downloadJobId: null,
  downloadTimer: null
};

const DEFAULT_RECOMMENDED_DOWNLOADS = [
  {
    "id": "nota-ai/bk-sdm-tiny",
    "name": "BK-SDM Tiny",
    "folder": "nota-ai--bk-sdm-tiny",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "nota-ai/bk-sdm-small",
    "name": "BK-SDM Small",
    "folder": "nota-ai--bk-sdm-small",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "optimum-intel-internal-testing/tiny-stable-diffusion-torch",
    "name": "Tiny Stable Diffusion Torch",
    "folder": "optimum-intel-internal-testing--tiny-stable-diffusion-torch",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "segmind/small-sd",
    "name": "Small SD",
    "folder": "segmind--small-sd",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "optimum-intel-internal-testing/tiny-random-latent-consistency",
    "name": "Tiny Random Latent Consistency",
    "folder": "optimum-intel-internal-testing--tiny-random-latent-consistency",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "segmind/tiny-sd",
    "name": "Tiny SD",
    "folder": "segmind--tiny-sd",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "optimum-intel-internal-testing/tiny-stable-diffusion-torch-custom-variant",
    "name": "Tiny Stable Diffusion Torch Custom Variant",
    "folder": "optimum-intel-internal-testing--tiny-stable-diffusion-torch-custom-variant",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "optimum-intel-internal-testing/tiny-random-stable-diffusion-with-safety-checker",
    "name": "Tiny Random Stable Diffusion With Safety Checker",
    "folder": "optimum-intel-internal-testing--tiny-random-stable-diffusion-with-safety-checker",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "optimum-intel-internal-testing/tiny-stable-diffusion-with-textual-inversion",
    "name": "Tiny Stable Diffusion With Textual Inversion",
    "folder": "optimum-intel-internal-testing--tiny-stable-diffusion-with-textual-inversion",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "echarlaix/tiny-random-latent-consistency",
    "name": "Tiny Random Latent Consistency",
    "folder": "echarlaix--tiny-random-latent-consistency",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "katuni4ka/tiny-stable-diffusion-torch-custom-variant",
    "name": "Tiny Stable Diffusion Torch Custom Variant",
    "folder": "katuni4ka--tiny-stable-diffusion-torch-custom-variant",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "diffusers/tiny-stable-diffusion-torch",
    "name": "Tiny Stable Diffusion Torch",
    "folder": "diffusers--tiny-stable-diffusion-torch",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "OFA-Sys/small-stable-diffusion-v0",
    "name": "Small Stable Diffusion V0",
    "folder": "OFA-Sys--small-stable-diffusion-v0",
    "tier": "4GB RAM",
    "description": "Tiny/test Diffusers pipeline for CPU setup checks. Best at 384px; output quality may be rough."
  },
  {
    "id": "stabilityai/sd-turbo",
    "name": "SD Turbo",
    "folder": "stabilityai--sd-turbo",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "SimianLuo/LCM_Dreamshaper_v7",
    "name": "LCM DreamShaper v7",
    "folder": "SimianLuo--LCM_Dreamshaper_v7",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "Lykon/dreamshaper-8-lcm",
    "name": "Dreamshaper 8 LCM",
    "folder": "Lykon--dreamshaper-8-lcm",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "IDKiro/sdxs-512-dreamshaper",
    "name": "Sdxs 512 Dreamshaper",
    "folder": "IDKiro--sdxs-512-dreamshaper",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "Lykon/DreamShaper",
    "name": "DreamShaper",
    "folder": "Lykon--DreamShaper",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "Lykon/dreamshaper-8",
    "name": "Dreamshaper 8",
    "folder": "Lykon--dreamshaper-8",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "Lykon/dreamshaper-7",
    "name": "Dreamshaper 7",
    "folder": "Lykon--dreamshaper-7",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "dreamlike-art/dreamlike-diffusion-1.0",
    "name": "Dreamlike Diffusion 1.0",
    "folder": "dreamlike-art--dreamlike-diffusion-1.0",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "dreamlike-art/dreamlike-anime-1.0",
    "name": "Dreamlike Anime 1.0",
    "folder": "dreamlike-art--dreamlike-anime-1.0",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "prompthero/openjourney",
    "name": "Openjourney",
    "folder": "prompthero--openjourney",
    "tier": "8GB RAM",
    "description": "Light CPU-friendly model. Try 384-512px and fewer steps for reasonable VPS latency."
  },
  {
    "id": "stable-diffusion-v1-5/stable-diffusion-v1-5",
    "name": "Stable Diffusion 1.5",
    "folder": "stable-diffusion-v1-5--stable-diffusion-v1-5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "CompVis/stable-diffusion-v1-4",
    "name": "Stable Diffusion 1.4",
    "folder": "CompVis--stable-diffusion-v1-4",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "CompVis/stable-diffusion-v1-1",
    "name": "Stable Diffusion 1.1",
    "folder": "CompVis--stable-diffusion-v1-1",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "crynux-network/stable-diffusion-v1-5",
    "name": "Stable Diffusion v1 5",
    "folder": "crynux-network--stable-diffusion-v1-5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "ckpt/sd15",
    "name": "SD 1.5",
    "folder": "ckpt--sd15",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "Jiali/stable-diffusion-1.5",
    "name": "Stable Diffusion 1.5",
    "folder": "Jiali--stable-diffusion-1.5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "nmkd/stable-diffusion-1.5-fp16",
    "name": "Stable Diffusion 1.5 FP16",
    "folder": "nmkd--stable-diffusion-1.5-fp16",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "botp/stable-diffusion-v1-5",
    "name": "Stable Diffusion v1 5",
    "folder": "botp--stable-diffusion-v1-5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "genai-archive/stable-diffusion-v1-5",
    "name": "Stable Diffusion v1 5",
    "folder": "genai-archive--stable-diffusion-v1-5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "stablediffusiontutorials/stable-diffusion-v1.5",
    "name": "Stable Diffusion V1.5",
    "folder": "stablediffusiontutorials--stable-diffusion-v1.5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "BAAI/AltDiffusion-m9",
    "name": "AltDiffusion M9",
    "folder": "BAAI--AltDiffusion-m9",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "hakurei/waifu-diffusion",
    "name": "Waifu Diffusion",
    "folder": "hakurei--waifu-diffusion",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "ckpt/anything-v3.0",
    "name": "Anything V3.0",
    "folder": "ckpt--anything-v3.0",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "genai-archive/anything-v5",
    "name": "Anything v5",
    "folder": "genai-archive--anything-v5",
    "tier": "16GB RAM",
    "description": "Standard SD1.x-class CPU model. Use 512px first; slower than GPU but no VRAM required."
  },
  {
    "id": "SG161222/Realistic_Vision_V5.1_noVAE",
    "name": "Realistic Vision V5.1 noVAE",
    "folder": "SG161222--Realistic_Vision_V5.1_noVAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "SG161222/Realistic_Vision_V6.0_B1_noVAE",
    "name": "Realistic Vision V6.0 B1 noVAE",
    "folder": "SG161222--Realistic_Vision_V6.0_B1_noVAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "SG161222/Realistic_Vision_V4.0_noVAE",
    "name": "Realistic Vision V4.0 noVAE",
    "folder": "SG161222--Realistic_Vision_V4.0_noVAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "SG161222/Realistic_Vision_V3.0_VAE",
    "name": "Realistic Vision V3.0 VAE",
    "folder": "SG161222--Realistic_Vision_V3.0_VAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "SG161222/Realistic_Vision_V5.0_noVAE",
    "name": "Realistic Vision V5.0 noVAE",
    "folder": "SG161222--Realistic_Vision_V5.0_noVAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "SG161222/Realistic_Vision_V2.0",
    "name": "Realistic Vision V2.0",
    "folder": "SG161222--Realistic_Vision_V2.0",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "stablediffusionapi/realistic-vision-v51",
    "name": "Realistic Vision V51",
    "folder": "stablediffusionapi--realistic-vision-v51",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "scenario-labs/Realistic_Vision_V5.1_noVAE",
    "name": "Realistic Vision V5.1 noVAE",
    "folder": "scenario-labs--Realistic_Vision_V5.1_noVAE",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "zbmacro/Realistic-Vision-V6.0-B1",
    "name": "Realistic Vision V6.0 B1",
    "folder": "zbmacro--Realistic-Vision-V6.0-B1",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "emilianJR/epiCRealism",
    "name": "epiCRealism",
    "folder": "emilianJR--epiCRealism",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "philz1337x/epicrealism",
    "name": "Epicrealism",
    "folder": "philz1337x--epicrealism",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "KamCastle/CyberRealistic42",
    "name": "CyberRealistic42",
    "folder": "KamCastle--CyberRealistic42",
    "tier": "24GB RAM",
    "description": "Heavier SD1.x realistic/anime model. Good for CPU boxes with extra RAM; expect longer runs."
  },
  {
    "id": "Manojb/stable-diffusion-2-1-base",
    "name": "Stable Diffusion 2 1 Base",
    "folder": "Manojb--stable-diffusion-2-1-base",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "sd2-community/stable-diffusion-2-1",
    "name": "Stable Diffusion 2 1",
    "folder": "sd2-community--stable-diffusion-2-1",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "sd-research/stable-diffusion-2-1-base",
    "name": "Stable Diffusion 2 1 Base",
    "folder": "sd-research--stable-diffusion-2-1-base",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "sd2-community/stable-diffusion-2",
    "name": "Stable Diffusion 2",
    "folder": "sd2-community--stable-diffusion-2",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "sd2-community/stable-diffusion-2-1-base",
    "name": "Stable Diffusion 2 1 Base",
    "folder": "sd2-community--stable-diffusion-2-1-base",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "Manojb/stable-diffusion-2-base",
    "name": "Stable Diffusion 2 Base",
    "folder": "Manojb--stable-diffusion-2-base",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "GraydientPlatformAPI/picx-real",
    "name": "Picx Real",
    "folder": "GraydientPlatformAPI--picx-real",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "stablediffusionapi/juggernaut-reborn",
    "name": "Juggernaut Reborn",
    "folder": "stablediffusionapi--juggernaut-reborn",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "scenario-labs/juggernaut_reborn",
    "name": "Juggernaut Reborn",
    "folder": "scenario-labs--juggernaut_reborn",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "digiplay/Photon_v1",
    "name": "Photon v1",
    "folder": "digiplay--Photon_v1",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "digiplay/GhostMix",
    "name": "GhostMix",
    "folder": "digiplay--GhostMix",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "digiplay/majicMIX_realistic_v6",
    "name": "majicMIX Realistic v6",
    "folder": "digiplay--majicMIX_realistic_v6",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "digiplay/majicMIX_realistic_v7",
    "name": "majicMIX Realistic v7",
    "folder": "digiplay--majicMIX_realistic_v7",
    "tier": "32GB RAM",
    "description": "SD2.x or heavier merge. CPU-compatible, but use 512px before pushing size or steps."
  },
  {
    "id": "prompthero/openjourney-v4",
    "name": "Openjourney v4",
    "folder": "prompthero--openjourney-v4",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "admruul/anything-v3.0",
    "name": "Anything V3.0",
    "folder": "admruul--anything-v3.0",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "ckpt/anything-v4.5-vae-swapped",
    "name": "Anything V4.5 VAE Swapped",
    "folder": "ckpt--anything-v4.5-vae-swapped",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "stablediffusionapi/anything-v5",
    "name": "Anything v5",
    "folder": "stablediffusionapi--anything-v5",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "DucHaiten/DucHaitenAIart",
    "name": "DucHaitenAIart",
    "folder": "DucHaiten--DucHaitenAIart",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "frankjoshua/toonyou_beta6",
    "name": "Toonyou Beta6",
    "folder": "frankjoshua--toonyou_beta6",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "dreamlike-art/dreamlike-photoreal-2.0",
    "name": "Dreamlike Photoreal 2.0",
    "folder": "dreamlike-art--dreamlike-photoreal-2.0",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "Lykon/AbsoluteReality",
    "name": "AbsoluteReality",
    "folder": "Lykon--AbsoluteReality",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "gsdf/Counterfeit-V2.5",
    "name": "Counterfeit V2.5",
    "folder": "gsdf--Counterfeit-V2.5",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "digiplay/DreamShaper_8",
    "name": "DreamShaper 8",
    "folder": "digiplay--DreamShaper_8",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "wavymulder/modelshoot",
    "name": "Modelshoot",
    "folder": "wavymulder--modelshoot",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "xiaolxl/GuoFeng3",
    "name": "GuoFeng3",
    "folder": "xiaolxl--GuoFeng3",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "p1atdev/pvc",
    "name": "Pvc",
    "folder": "p1atdev--pvc",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "KBlueLeaf/kohaku-v2.1",
    "name": "Kohaku V2.1",
    "folder": "KBlueLeaf--kohaku-v2.1",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "nitrosocke/Ghibli-Diffusion",
    "name": "Ghibli Diffusion",
    "folder": "nitrosocke--Ghibli-Diffusion",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "Onodofthenorth/SD_PixelArt_SpriteSheet_Generator",
    "name": "SD PixelArt SpriteSheet Generator",
    "folder": "Onodofthenorth--SD_PixelArt_SpriteSheet_Generator",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "6DammK9/AstolfoMix",
    "name": "AstolfoMix",
    "folder": "6DammK9--AstolfoMix",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "redstonehero/animesh_prunedv21",
    "name": "Animesh Prunedv21",
    "folder": "redstonehero--animesh_prunedv21",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "EK12317/Ekmix-Diffusion",
    "name": "Ekmix Diffusion",
    "folder": "EK12317--Ekmix-Diffusion",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  },
  {
    "id": "Meina/MeinaMix_V11",
    "name": "MeinaMix V11",
    "folder": "Meina--MeinaMix_V11",
    "tier": "56GB RAM",
    "description": "Heavier CPU-friendly catalog pick for high-RAM VPS use. Still avoids FLUX/SDXL VRAM requirements."
  }
];

const elements = {
  form: document.getElementById("generateForm"),
  prompt: document.getElementById("prompt"),
  negativePrompt: document.getElementById("negativePrompt"),
  model: document.getElementById("model"),
  recommendedDownloadModel: document.getElementById("recommendedDownloadModel"),
  recommendedModelInfo: document.getElementById("recommendedModelInfo"),
  hfModelId: document.getElementById("hfModelId"),
  downloadFolderName: document.getElementById("downloadFolderName"),
  saveModelButton: document.getElementById("saveModelButton"),
  downloadModelButton: document.getElementById("downloadModelButton"),
  refreshModelsButton: document.getElementById("refreshModelsButton"),
  backend: document.getElementById("backend"),
  profile: document.getElementById("profile"),
  width: document.getElementById("width"),
  height: document.getElementById("height"),
  steps: document.getElementById("steps"),
  guidanceScale: document.getElementById("guidanceScale"),
  seed: document.getElementById("seed"),
  generateButton: document.getElementById("generateButton"),
  unloadButton: document.getElementById("unloadButton"),
  generationProgress: document.getElementById("generationProgress"),
  progressFill: document.getElementById("progressFill"),
  progressLabel: document.getElementById("progressLabel"),
  progressPercent: document.getElementById("progressPercent"),
  statusText: document.getElementById("statusText"),
  statusBox: document.querySelector(".status-box"),
  loadedModelName: document.getElementById("loadedModelName"),
  loadedModelSource: document.getElementById("loadedModelSource"),
  loadedModelLocation: document.getElementById("loadedModelLocation"),
  healthPill: document.getElementById("healthPill"),
  imageStage: document.getElementById("imageStage"),
  outputMeta: document.getElementById("outputMeta"),
  galleryGrid: document.getElementById("galleryGrid")
};

function setStatus(message, tone = "normal") {
  elements.statusText.textContent = message;
  elements.statusBox.classList.toggle("warning", tone === "warning");
  elements.statusBox.classList.toggle("error", tone === "error");
}

function setHealth(message, ok) {
  elements.healthPill.textContent = message;
  elements.healthPill.classList.toggle("ok", ok === true);
  elements.healthPill.classList.toggle("bad", ok === false);
}

function setModelLocationInfo(name, source, location) {
  elements.loadedModelName.textContent = name || "No model selected";
  elements.loadedModelSource.textContent = source || "-";
  elements.loadedModelLocation.textContent = location || "Select a model to preview its folder or repo.";
  elements.loadedModelLocation.title = location || "";
}

function selectedModelInfo() {
  const selectedValue = elements.model.value || "";
  const selected = state.models.find((model) => model.value === selectedValue);
  if (!selected) {
    return null;
  }

  if (selected.type === "huggingface") {
    return {
      name: selected.label.replace(/^HF:\s*/, ""),
      source: "selected Hugging Face repo",
      location: selected.value.replace(/^hf:/, "")
    };
  }

  return {
    name: selected.label.replace(/\s+\(not found\)$/, ""),
    source: "selected local folder",
    location: selected.path || selected.relativePath || `models/${selected.value}`
  };
}

function updateSelectedModelInfo() {
  const info = selectedModelInfo();
  if (!info) {
    return;
  }
  setModelLocationInfo(info.name, info.source, info.location);
}

function setGenerationProgress(value, label) {
  const progressValue = Math.max(0, Math.min(100, Math.round(value)));
  state.generationProgressValue = progressValue;
  elements.generationProgress.hidden = false;
  elements.progressFill.style.width = `${progressValue}%`;
  elements.progressPercent.textContent = `${progressValue}%`;
  elements.progressLabel.textContent = label;
  elements.generationProgress.classList.toggle("complete", progressValue >= 100);
  elements.generationProgress.classList.remove("failed");
  const progressTrack = elements.generationProgress.querySelector(".progress-track");
  progressTrack.setAttribute("aria-valuenow", String(progressValue));
}

function startGenerationProgress() {
  window.clearInterval(state.generationProgressTimer);
  window.clearTimeout(state.generationProgressHideTimer);
  setGenerationProgress(4, "Preparing model");

  state.generationProgressTimer = window.setInterval(() => {
    const current = state.generationProgressValue;
    const next = current + Math.max(1, (92 - current) * 0.08);
    const label = next < 22
      ? "Loading model"
      : next < 82
        ? "Generating image"
        : "Finishing image";
    setGenerationProgress(Math.min(next, 92), label);
  }, 900);
}

function stopGenerationProgress(success) {
  window.clearInterval(state.generationProgressTimer);
  state.generationProgressTimer = null;

  if (success) {
    setGenerationProgress(100, "Complete");
    state.generationProgressHideTimer = window.setTimeout(() => {
      elements.generationProgress.hidden = true;
      elements.generationProgress.classList.remove("complete");
    }, 900);
    return;
  }

  elements.generationProgress.hidden = false;
  elements.generationProgress.classList.add("failed");
  elements.generationProgress.classList.remove("complete");
  elements.progressLabel.textContent = "Generation failed";
  state.generationProgressHideTimer = window.setTimeout(() => {
    elements.generationProgress.hidden = true;
    elements.generationProgress.classList.remove("failed");
  }, 2200);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {
      success: false,
      error: "Server returned HTML instead of JSON. Restart PromptLite, then refresh the browser."
    };
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with status ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

function selectValue(select, value) {
  const stringValue = String(value);
  const option = Array.from(select.options).find((item) => item.value === stringValue);
  if (option) {
    select.value = stringValue;
  }
}

function applySettings(settings) {
  state.settings = settings;
  selectValue(elements.backend, settings.default_backend || "auto");
  selectValue(elements.profile, settings.default_performance_profile || "full_power");
  selectValue(elements.width, settings.default_width || 512);
  selectValue(elements.height, settings.default_height || 512);
  elements.steps.value = settings.default_steps || 20;
  elements.guidanceScale.value = settings.default_guidance_scale || 7.5;
  elements.hfModelId.value = (settings.huggingface_model_ids || []).join(", ");
  updateDownloadFolderSuggestion();
}

function flattenModels(payload) {
  const local = (payload.local_models || []).map((model) => ({
    value: model.id,
    label: `${model.name}${model.available ? "" : " (not found)"}`,
    available: model.available,
    type: "local",
    path: model.path,
    relativePath: model.relative_path
  }));

  const huggingFace = (payload.huggingface_models || []).map((model) => ({
    value: `hf:${model.id}`,
    label: `HF: ${model.id}`,
    available: true,
    type: "huggingface",
    path: model.id
  }));

  return [...local, ...huggingFace];
}

function folderNameFromModelId(modelId) {
  return modelId
    .replace(/^hf:/, "")
    .trim()
    .replace(/[\\\/]+/g, "--")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 96);
}

function firstModelIdFromInput() {
  return elements.hfModelId.value
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)[0] || "";
}

function updateDownloadFolderSuggestion() {
  const modelId = firstModelIdFromInput();
  if (!modelId || elements.downloadFolderName.value.trim()) {
    return;
  }
  elements.downloadFolderName.value = folderNameFromModelId(modelId);
}

function populateRecommendedDownloads(recommendedDownloads) {
  const downloads = Array.isArray(recommendedDownloads) && recommendedDownloads.length > 0
    ? recommendedDownloads
    : DEFAULT_RECOMMENDED_DOWNLOADS;

  const tierOrder = ["4GB RAM", "8GB RAM", "16GB RAM", "24GB RAM", "32GB RAM", "56GB RAM", "Other"];
  state.recommendedDownloads = downloads;
  elements.recommendedDownloadModel.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a model to download";
  elements.recommendedDownloadModel.appendChild(placeholder);

  for (const tier of tierOrder) {
    const modelsForTier = downloads.filter((model) => (model.tier || "Other") === tier);
    if (modelsForTier.length === 0) {
      continue;
    }

    const group = document.createElement("optgroup");
    group.label = tier;

    for (const model of modelsForTier) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      group.appendChild(option);
    }

    elements.recommendedDownloadModel.appendChild(group);
  }
}

function applyRecommendedDownload() {
  const selectedId = elements.recommendedDownloadModel.value;
  if (!selectedId) {
    return;
  }

  const selected = state.recommendedDownloads.find((model) => model.id === selectedId);
  if (!selected) {
    return;
  }

  elements.hfModelId.value = selected.id;
  elements.downloadFolderName.value = selected.folder || folderNameFromModelId(selected.id);
  elements.recommendedModelInfo.textContent = `${selected.tier || "Other"}: ${selected.description || selected.id}`;
  setStatus(`${selected.name} selected for download.`);
}

function populateModels(payload) {
  const models = flattenModels(payload);
  state.models = models;
  populateRecommendedDownloads(payload.recommended_downloads);
  elements.model.innerHTML = "";
  elements.generateButton.disabled = false;

  if (models.length === 0 || models.every((model) => !model.available)) {
    const option = document.createElement("option");
    option.value = "default";
    option.textContent = "No model found";
    elements.model.appendChild(option);
    elements.generateButton.disabled = true;
    setModelLocationInfo(null, null, null);
    setStatus("No model found. Please place a supported model inside the models folder or configure a Hugging Face model ID.", "warning");
    return;
  }

  for (const model of models) {
    const option = document.createElement("option");
    option.value = model.value;
    option.textContent = model.label;
    option.disabled = model.type === "local" && !model.available;
    elements.model.appendChild(option);
  }

  const defaultModel = payload.default_model && payload.default_model !== "default"
    ? payload.default_model
    : models.find((model) => model.available)?.value;

  if (defaultModel) {
    selectValue(elements.model, defaultModel);
  }

  updateSelectedModelInfo();
}

function applyProfile(profile) {
  if (profile === "low_ram") {
    selectValue(elements.width, 384);
    selectValue(elements.height, 384);
    elements.steps.value = 10;
    elements.guidanceScale.value = 7.0;
    return;
  }

  if (profile === "balanced") {
    selectValue(elements.width, 512);
    selectValue(elements.height, 512);
    elements.steps.value = 20;
    elements.guidanceScale.value = 7.5;
    return;
  }

  if (profile === "quality") {
    selectValue(elements.width, 512);
    selectValue(elements.height, 512);
    elements.steps.value = 30;
    elements.guidanceScale.value = 7.5;
    return;
  }

  if (profile === "full_power") {
    selectValue(elements.width, 768);
    selectValue(elements.height, 768);
    elements.steps.value = 40;
    elements.guidanceScale.value = 7.5;
  }
}

function handleBackendChange() {
  if (elements.backend.value === "cpu") {
    selectValue(elements.profile, "low_ram");
    applyProfile("low_ram");
    setStatus("CPU generation can be slow. Use smaller resolution and fewer steps for faster results.", "warning");
  }
}

function generationPayload() {
  return {
    prompt: elements.prompt.value.trim(),
    negative_prompt: elements.negativePrompt.value.trim(),
    width: Number(elements.width.value),
    height: Number(elements.height.value),
    steps: Number(elements.steps.value),
    guidance_scale: Number(elements.guidanceScale.value),
    seed: Number(elements.seed.value || -1),
    backend: elements.backend.value,
    model: elements.model.value || "default",
    performance_profile: elements.profile.value
  };
}

function showImage(imagePath, metadataText) {
  elements.imageStage.innerHTML = "";
  const image = document.createElement("img");
  image.alt = "Generated image";
  image.src = `${imagePath}${imagePath.includes("?") ? "&" : "?"}t=${Date.now()}`;
  elements.imageStage.appendChild(image);
  elements.outputMeta.textContent = metadataText || "";
}

async function refreshGallery() {
  try {
    const payload = await requestJson("/api/gallery");
    elements.galleryGrid.innerHTML = "";

    if (!payload.images || payload.images.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-gallery";
      empty.textContent = "No recent images yet.";
      elements.galleryGrid.appendChild(empty);
      return;
    }

    for (const item of payload.images) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = item.name;
      const img = document.createElement("img");
      img.alt = item.name;
      img.src = item.image;
      button.appendChild(img);
      button.addEventListener("click", () => showImage(item.image, item.name));
      elements.galleryGrid.appendChild(button);
    }
  } catch (error) {
    elements.galleryGrid.innerHTML = "";
  }
}

async function refreshModels() {
  try {
    const models = await requestJson("/api/models");
    populateModels(models);
    if (state.models.some((model) => model.available)) {
      setStatus("Models refreshed.");
    }
  } catch (error) {
    setStatus(error.message || "Could not refresh models.", "error");
  }
}

async function pollDownload(jobId) {
  try {
    const job = await requestJson(`/api/download/${encodeURIComponent(jobId)}`);
    setStatus(job.error ? `${job.message} ${job.error}` : job.message, job.status === "failed" ? "error" : "normal");

    if (job.status === "completed") {
      window.clearInterval(state.downloadTimer);
      state.downloadTimer = null;
      state.downloadJobId = null;
      elements.downloadModelButton.disabled = false;
      await refreshModels();
      selectValue(elements.model, job.folder_name);
      setStatus(`Download complete. Selected models/${job.folder_name}.`);
    }

    if (job.status === "failed") {
      window.clearInterval(state.downloadTimer);
      state.downloadTimer = null;
      state.downloadJobId = null;
      elements.downloadModelButton.disabled = false;
    }
  } catch (error) {
    window.clearInterval(state.downloadTimer);
    state.downloadTimer = null;
    state.downloadJobId = null;
    elements.downloadModelButton.disabled = false;
    setStatus(error.message || "Could not check download status.", "error");
  }
}

async function loadInitialState() {
  try {
    const [health, settings, models] = await Promise.all([
      requestJson("/api/health"),
      requestJson("/api/settings"),
      requestJson("/api/models")
    ]);

    setHealth("Backend ready", true);
    applySettings(settings);
    populateModels(models);
    if (health.model_loaded) {
      setModelLocationInfo(
        health.loaded_model,
        health.loaded_model_source,
        health.loaded_model_location
      );
    }

    const backendName = health.selected_backend || settings.default_backend || "auto";
    if (elements.statusText.textContent === "Ready.") {
      setStatus(`Ready. Backend mode: ${backendName}.`);
    }
  } catch (error) {
    setHealth("Backend offline", false);
    setStatus(error.message || "Python backend is not running. Start PromptLite again.", "error");
  }

  refreshGallery();
}

async function generateImage(event) {
  event.preventDefault();
  if (state.generating) {
    return;
  }

  const payload = generationPayload();
  if (!payload.prompt) {
    setStatus("Enter a prompt before generating.", "warning");
    return;
  }

  state.generating = true;
  elements.generateButton.disabled = true;
  startGenerationProgress();
  setStatus("Generating image. CPU mode can take several minutes.");

  try {
    const result = await requestJson("/api/generate", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!result.success) {
      throw new Error(result.error || "Generation failed.");
    }

    const seconds = Number(result.generation_time_seconds || 0).toFixed(1);
    const metadata = `${result.backend_used} | seed ${result.seed} | ${seconds}s`;
    showImage(result.image, metadata);
    setModelLocationInfo(result.model_used, result.model_source, result.model_location);
    setStatus(`Done. Used ${result.backend_used} with ${result.model_used}.`);
    refreshGallery();
    stopGenerationProgress(true);
  } catch (error) {
    const details = error.payload && error.payload.details ? ` ${error.payload.details}` : "";
    setStatus(`${error.message || "Generation failed."}${details}`, "error");
    stopGenerationProgress(false);
  } finally {
    state.generating = false;
    elements.generateButton.disabled = false;
  }
}

async function unloadModel() {
  elements.unloadButton.disabled = true;
  setStatus("Unloading model from memory.");

  try {
    const result = await requestJson("/api/unload", { method: "POST", body: JSON.stringify({}) });
    setModelLocationInfo(null, null, null);
    setStatus(result.message || "Model unloaded.");
  } catch (error) {
    setStatus(error.message || "Could not unload model.", "error");
  } finally {
    elements.unloadButton.disabled = false;
  }
}

async function saveModelId() {
  const ids = elements.hfModelId.value
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  elements.saveModelButton.disabled = true;
  setStatus("Saving model settings.");

  try {
    const settings = await requestJson("/api/settings", {
      method: "POST",
      body: JSON.stringify({ huggingface_model_ids: ids })
    });
    applySettings(settings);
    await refreshModels();
    setStatus(ids.length > 0 ? "Model ID saved. Select it from the model dropdown, then generate." : "Model ID list cleared.", ids.length > 0 ? "normal" : "warning");
  } catch (error) {
    setStatus(error.message || "Could not save model settings.", "error");
  } finally {
    elements.saveModelButton.disabled = false;
  }
}

async function downloadModel() {
  const modelId = firstModelIdFromInput();
  if (!modelId) {
    setStatus("Enter a Hugging Face model ID before downloading.", "warning");
    return;
  }

  const folderName = elements.downloadFolderName.value.trim() || folderNameFromModelId(modelId);
  elements.downloadFolderName.value = folderName;
  elements.downloadModelButton.disabled = true;
  setStatus("Starting model download. Large models can take a while.");

  try {
    const job = await requestJson("/api/download", {
      method: "POST",
      body: JSON.stringify({
        model_id: modelId,
        folder_name: folderName
      })
    });

    state.downloadJobId = job.id;
    setStatus(job.message || "Download started.");
    state.downloadTimer = window.setInterval(() => pollDownload(job.id), 2000);
    pollDownload(job.id);
  } catch (error) {
    elements.downloadModelButton.disabled = false;
    const details = error.payload && error.payload.details ? ` ${error.payload.details}` : "";
    setStatus(`${error.message || "Could not start download."}${details}`, "error");
  }
}

elements.form.addEventListener("submit", generateImage);
elements.unloadButton.addEventListener("click", unloadModel);
elements.saveModelButton.addEventListener("click", saveModelId);
elements.downloadModelButton.addEventListener("click", downloadModel);
elements.refreshModelsButton.addEventListener("click", refreshModels);
elements.recommendedDownloadModel.addEventListener("change", applyRecommendedDownload);
elements.model.addEventListener("change", updateSelectedModelInfo);
elements.hfModelId.addEventListener("input", updateDownloadFolderSuggestion);
elements.profile.addEventListener("change", () => applyProfile(elements.profile.value));
elements.backend.addEventListener("change", handleBackendChange);

loadInitialState();
