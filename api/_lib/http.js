function isAllowedDevOrigin(origin) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function withCors(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedDevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
  }
}

function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function sanitizeReturnBaseUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value));
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function inferBaseUrl(req, returnBaseUrl) {
  if (returnBaseUrl) return returnBaseUrl.replace(/\/+$/, "");
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/+$/, "");
  }

  const protoHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader || "https";
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${protocol}://${host}`;
}

module.exports = {
  withCors,
  handleOptions,
  sanitizeReturnBaseUrl,
  inferBaseUrl,
};
