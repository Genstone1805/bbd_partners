const FORM_URLENCODED_UTF8_CONTENT_TYPE =
  "application/x-www-form-urlencoded; charset=UTF-8";

function buildPaymentSuccessFormBody(payload) {
  const params = new URLSearchParams();

  if (!payload || typeof payload !== "object") {
    return params.toString();
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const serializedValue =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value ?? "");

    params.append(key, serializedValue);
  });

  return params.toString();
}

function parseSerializedJsonField(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function parseRawRequestBody(body) {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      const params = new URLSearchParams(trimmed);
      const parsed = {};
      for (const [key, value] of params.entries()) {
        parsed[key] = value;
      }
      return parsed;
    }
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return parseRawRequestBody(body.toString("utf8"));
  }

  if (typeof body === "object") {
    return { ...body };
  }

  return null;
}

function normalizePaymentSuccessBody(body) {
  const parsed = parseRawRequestBody(body);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return {
    ...parsed,
    formData: parseSerializedJsonField(parsed.formData, null),
    paymentInformation: parseSerializedJsonField(parsed.paymentInformation, {}),
  };
}

module.exports = {
  FORM_URLENCODED_UTF8_CONTENT_TYPE,
  buildPaymentSuccessFormBody,
  normalizePaymentSuccessBody,
};
