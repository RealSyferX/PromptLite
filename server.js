const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const rootDir = __dirname;
const configPath = path.join(rootDir, "config", "default-config.json");

function loadConfig() {
  const fallback = {
    node_host: "127.0.0.1",
    node_port: 1234,
    python_backend_url: "http://127.0.0.1:7861",
    outputs_dir: "outputs",
    public_url: ""
  };

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return { ...fallback, ...JSON.parse(raw) };
  } catch (error) {
    console.warn(`Could not read config/default-config.json: ${error.message}`);
    return fallback;
  }
}

const config = loadConfig();
const nodePort = Number(process.env.PROMPTLITE_NODE_PORT || process.env.NODE_PORT || config.node_port || 1234);
const host = process.env.PROMPTLITE_NODE_HOST || process.env.HOST || config.node_host || "127.0.0.1";
const pythonBackendUrl = (process.env.PROMPTLITE_PYTHON_BACKEND_URL || config.python_backend_url || "http://127.0.0.1:7861").replace(/\/+$/, "");
const outputsDir = path.resolve(rootDir, process.env.PROMPTLITE_OUTPUTS_DIR || config.outputs_dir || "outputs");
const publicDir = path.join(rootDir, "public");
const publicUrl = (process.env.PROMPTLITE_PUBLIC_URL || config.public_url || "").replace(/\/+$/, "");

fs.mkdirSync(outputsDir, { recursive: true });

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir));
app.use("/outputs", express.static(outputsDir));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON request body.",
      details: error.message
    });
  }
  return next(error);
});

function backendOfflinePayload(error) {
  return {
    success: false,
    error: "Python backend is not running. Start PromptLite with the Windows or VPS start script.",
    details: error && error.message ? error.message : "Backend request failed."
  };
}

async function proxyToBackend(req, res, backendPath, options = {}) {
  const method = options.method || req.method;
  const body = options.body === undefined ? req.body : options.body;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 60 * 60 * 1000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${pythonBackendUrl}${backendPath}`, {
      method,
      headers: method === "GET" ? undefined : { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      signal: controller.signal
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {
        success: false,
        error: "Python backend returned a non-JSON response.",
        details: text
      };
    }

    return res.status(response.status).json(payload);
  } catch (error) {
    const status = error.name === "AbortError" ? 504 : 503;
    const payload = error.name === "AbortError"
      ? { success: false, error: "Generation timed out. Try fewer steps or a smaller image size." }
      : backendOfflinePayload(error);

    return res.status(status).json(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function listRecentImages() {
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);

  return fs.readdirSync(outputsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const absolutePath = path.join(outputsDir, entry.name);
      const stat = fs.statSync(absolutePath);
      return {
        name: entry.name,
        image: `/outputs/${encodeURIComponent(entry.name)}`,
        modified: stat.mtimeMs
      };
    })
    .sort((a, b) => b.modified - a.modified)
    .slice(0, 12);
}

function hostForUrl(hostname) {
  return hostname.includes(":") && !hostname.startsWith("[") ? `[${hostname}]` : hostname;
}

app.get("/api/health", (req, res) => proxyToBackend(req, res, "/health", { method: "GET", timeoutMs: 5000 }));
app.get("/api/hardware", (req, res) => proxyToBackend(req, res, "/hardware", { method: "GET", timeoutMs: 10000 }));
app.get("/api/models", (req, res) => proxyToBackend(req, res, "/models", { method: "GET", timeoutMs: 10000 }));
app.get("/api/downloads", (req, res) => proxyToBackend(req, res, "/downloads", { method: "GET", timeoutMs: 10000 }));
app.get("/api/download/:jobId", (req, res) => proxyToBackend(req, res, `/download/${encodeURIComponent(req.params.jobId)}`, { method: "GET", timeoutMs: 10000 }));
app.post("/api/download", (req, res) => proxyToBackend(req, res, "/download", { timeoutMs: 30000 }));
app.post("/api/generate", (req, res) => proxyToBackend(req, res, "/generate"));
app.post("/api/unload", (req, res) => proxyToBackend(req, res, "/unload", { timeoutMs: 30000 }));
app.get("/api/settings", (req, res) => proxyToBackend(req, res, "/settings", { method: "GET", timeoutMs: 10000 }));
app.post("/api/settings", (req, res) => proxyToBackend(req, res, "/settings", { timeoutMs: 30000 }));

app.get("/api/gallery", (req, res) => {
  try {
    res.json({ success: true, images: listRecentImages() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Could not read output gallery.", details: error.message });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Unknown API route. If you just updated PromptLite, restart the PromptLite server."
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(nodePort, host, () => {
  const listenUrl = `http://${hostForUrl(host)}:${nodePort}`;
  const browserUrl = publicUrl || (host === "0.0.0.0" || host === "::" ? `http://<server-ip>:${nodePort}` : listenUrl);
  console.log(`PromptLite UI listening on ${listenUrl}`);
  console.log(`Open PromptLite at ${browserUrl}`);
  console.log(`Proxying Python backend at ${pythonBackendUrl}`);
});
