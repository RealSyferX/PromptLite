const state = {
  settings: null,
  models: [],
  recommendedDownloads: [],
  generating: false,
  downloadJobId: null,
  downloadTimer: null
};

const DEFAULT_RECOMMENDED_DOWNLOADS = [
  {
    id: "nota-ai/bk-sdm-small",
    name: "BK-SDM Small",
    folder: "bk-sdm-small",
    tier: "Low",
    description: "Recommended lightweight starter model."
  },
  {
    id: "nota-ai/bk-sdm-tiny",
    name: "BK-SDM Tiny",
    folder: "bk-sdm-tiny",
    tier: "Lowest",
    description: "Very small CPU test model."
  },
  {
    id: "stable-diffusion-v1-5/stable-diffusion-v1-5",
    name: "Stable Diffusion 1.5",
    folder: "stable-diffusion-v1-5",
    tier: "Mid-End",
    description: "Classic general-purpose model."
  },
  {
    id: "SimianLuo/LCM_Dreamshaper_v7",
    name: "LCM DreamShaper v7",
    folder: "lcm-dreamshaper-v7",
    tier: "Mid-End",
    description: "Fast low-step model."
  },
  {
    id: "segmind/SSD-1B",
    name: "SSD-1B",
    folder: "ssd-1b",
    tier: "HighEnd",
    description: "Better quality compact SDXL-style model."
  },
  {
    id: "stabilityai/stable-diffusion-xl-base-1.0",
    name: "Stable Diffusion XL Base 1.0",
    folder: "sdxl-base-1.0",
    tier: "Powerful",
    description: "Large high-quality SDXL base model."
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
  statusText: document.getElementById("statusText"),
  statusBox: document.querySelector(".status-box"),
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
      error: "Server returned HTML instead of JSON. Restart PromptLite with scripts\\start-windows.bat, then refresh the browser."
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
  selectValue(elements.profile, settings.default_performance_profile || "balanced");
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
    type: "local"
  }));

  const huggingFace = (payload.huggingface_models || []).map((model) => ({
    value: `hf:${model.id}`,
    label: `HF: ${model.id}`,
    available: true,
    type: "huggingface"
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

  const tierOrder = ["Lowest", "Low", "Mid-End", "HighEnd", "Powerful", "Other"];
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

    const backendName = health.selected_backend || settings.default_backend || "auto";
    if (elements.statusText.textContent === "Ready.") {
      setStatus(`Ready. Backend mode: ${backendName}.`);
    }
  } catch (error) {
    setHealth("Backend offline", false);
    setStatus(error.message || "Python backend is not running. Start it with scripts/start-windows.bat.", "error");
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
    setStatus(`Done. Used ${result.backend_used} with ${result.model_used}.`);
    refreshGallery();
  } catch (error) {
    const details = error.payload && error.payload.details ? ` ${error.payload.details}` : "";
    setStatus(`${error.message || "Generation failed."}${details}`, "error");
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
elements.hfModelId.addEventListener("input", updateDownloadFolderSuggestion);
elements.profile.addEventListener("change", () => applyProfile(elements.profile.value));
elements.backend.addEventListener("change", handleBackendChange);

loadInitialState();
