const elements = {
  form: document.getElementById("settingsForm"),
  healthPill: document.getElementById("healthPill"),
  statusText: document.getElementById("statusText"),
  statusBox: document.querySelector(".status-box"),
  defaultBackend: document.getElementById("defaultBackend"),
  defaultProfile: document.getElementById("defaultProfile"),
  defaultWidth: document.getElementById("defaultWidth"),
  defaultHeight: document.getElementById("defaultHeight"),
  defaultSteps: document.getElementById("defaultSteps"),
  defaultGuidance: document.getElementById("defaultGuidance"),
  defaultModel: document.getElementById("defaultModel"),
  hfModelIds: document.getElementById("hfModelIds"),
  unloadAfterGeneration: document.getElementById("unloadAfterGeneration"),
  saveSettingsButton: document.getElementById("saveSettingsButton")
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
  const option = Array.from(select.options).find((item) => item.value === String(value));
  if (option) {
    select.value = String(value);
  }
}

function modelOptions(payload) {
  const local = (payload.local_models || []).map((model) => ({
    value: model.id,
    label: `${model.name}${model.available ? "" : " (not found)"}`,
    disabled: !model.available
  }));

  const huggingFace = (payload.huggingface_models || []).map((model) => ({
    value: `hf:${model.id}`,
    label: `HF: ${model.id}`,
    disabled: false
  }));

  return [
    { value: "default", label: "Default", disabled: false },
    ...local,
    ...huggingFace
  ];
}

function populateModels(payload, selectedModel) {
  elements.defaultModel.innerHTML = "";

  for (const model of modelOptions(payload)) {
    const option = document.createElement("option");
    option.value = model.value;
    option.textContent = model.label;
    option.disabled = model.disabled;
    elements.defaultModel.appendChild(option);
  }

  selectValue(elements.defaultModel, selectedModel || "default");
}

function applySettings(settings) {
  selectValue(elements.defaultBackend, settings.default_backend || "auto");
  selectValue(elements.defaultProfile, settings.default_performance_profile || "balanced");
  selectValue(elements.defaultWidth, settings.default_width || 512);
  selectValue(elements.defaultHeight, settings.default_height || 512);
  elements.defaultSteps.value = settings.default_steps || 20;
  elements.defaultGuidance.value = settings.default_guidance_scale || 7.5;
  elements.hfModelIds.value = (settings.huggingface_model_ids || []).join("\n");
  elements.unloadAfterGeneration.checked = Boolean(settings.unload_model_after_generation);
}

function parseModelIds() {
  return elements.hfModelIds.value
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function loadSettingsPage() {
  try {
    const [health, settings, models] = await Promise.all([
      requestJson("/api/health"),
      requestJson("/api/settings"),
      requestJson("/api/models")
    ]);
    setHealth("Backend ready", true);
    applySettings(settings);
    populateModels(models, settings.default_model);
    setStatus(`Ready. Backend mode: ${health.selected_backend || settings.default_backend || "auto"}.`);
  } catch (error) {
    setHealth("Backend offline", false);
    setStatus(error.message || "Python backend is not running. Start it with scripts/start-windows.bat.", "error");
  }
}

async function saveSettings(event) {
  event.preventDefault();
  elements.saveSettingsButton.disabled = true;
  setStatus("Saving settings.");

  const payload = {
    default_backend: elements.defaultBackend.value,
    default_model: elements.defaultModel.value,
    default_width: Number(elements.defaultWidth.value),
    default_height: Number(elements.defaultHeight.value),
    default_steps: Number(elements.defaultSteps.value),
    default_guidance_scale: Number(elements.defaultGuidance.value),
    default_performance_profile: elements.defaultProfile.value,
    unload_model_after_generation: elements.unloadAfterGeneration.checked,
    huggingface_model_ids: parseModelIds()
  };

  try {
    const settings = await requestJson("/api/settings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const models = await requestJson("/api/models");
    applySettings(settings);
    populateModels(models, settings.default_model);
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error.message || "Could not save settings.", "error");
  } finally {
    elements.saveSettingsButton.disabled = false;
  }
}

elements.form.addEventListener("submit", saveSettings);
loadSettingsPage();
