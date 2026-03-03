export const TOOL_NAME = `JWT payload decoder and expiry checker`;
export const TOOL_SUMMARY = `Decode JWT payloads instantly and check expiry status for quick auth debugging.`;
export const SAMPLE_INPUT = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQXZhIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9.`;
export const MODES = [
  {
    "value": "decode-payload",
    "label": "Decode payload JSON"
  },
  {
    "value": "expiry-report",
    "label": "Expiry status report"
  }
];

function decodeBase64Url(segment) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + "=".repeat(paddingLength);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  if (typeof atob === "function") {
    return atob(padded);
  }
  throw new Error("Base64 decoder not available.");
}

function parseJwt(input) {
  const token = String(input || "").trim();
  if (!token) {
    throw new Error("Input cannot be empty.");
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("JWT must contain at least header and payload segments.");
  }

  let payloadText = "";
  try {
    payloadText = decodeBase64Url(parts[1]);
  } catch {
    throw new Error("JWT payload is not valid Base64URL.");
  }

  try {
    return JSON.parse(payloadText);
  } catch {
    throw new Error("JWT payload is not valid JSON.");
  }
}

function formatIsoFromEpoch(seconds) {
  if (!Number.isFinite(seconds)) {
    return "n/a";
  }
  return new Date(seconds * 1000).toISOString();
}

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

  const payload = parseJwt(input);
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  const now = Math.floor(Date.now() / 1000);

  if (mode === "decode-payload") {
    return JSON.stringify(payload, null, 2);
  }

  if (mode === "expiry-report") {
    if (!Number.isFinite(exp)) {
      return [
        "Status: NO_EXP",
        `Issued at: ${formatIsoFromEpoch(iat)}`,
        "Expires at: n/a",
        "Remaining: n/a"
      ].join("\n");
    }

    const remaining = exp - now;
    const status = remaining >= 0 ? "VALID" : "EXPIRED";
    const remainingText = remaining >= 0 ? `${remaining}s` : `${Math.abs(remaining)}s ago`;
    return [
      `Status: ${status}`,
      `Issued at: ${formatIsoFromEpoch(iat)}`,
      `Expires at: ${formatIsoFromEpoch(exp)}`,
      `Remaining: ${remainingText}`
    ].join("\n");
  }

  throw new Error("Unsupported mode.");
}
