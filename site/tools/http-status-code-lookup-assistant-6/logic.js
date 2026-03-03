export const TOOL_NAME = `HTTP status code lookup assistant`;
export const TOOL_SUMMARY = `Look up HTTP status meanings quickly, including single-code and batch lookup modes.`;
export const SAMPLE_INPUT = `404`;
export const MODES = [
  {
    "value": "lookup-single",
    "label": "Lookup single status code"
  },
  {
    "value": "lookup-batch",
    "label": "Lookup multiple codes"
  }
];

const STATUS_MAP = {
  200: { phrase: "OK", detail: "Request succeeded and response includes the requested resource." },
  201: { phrase: "Created", detail: "Request succeeded and created a new resource." },
  204: { phrase: "No Content", detail: "Request succeeded and intentionally returned no response body." },
  301: { phrase: "Moved Permanently", detail: "Resource has a permanent new URL." },
  302: { phrase: "Found", detail: "Resource is temporarily available at a different URL." },
  304: { phrase: "Not Modified", detail: "Cached representation is still valid." },
  400: { phrase: "Bad Request", detail: "Server could not understand the request due to invalid syntax." },
  401: { phrase: "Unauthorized", detail: "Authentication is required or credentials were invalid." },
  403: { phrase: "Forbidden", detail: "Server understood request but refuses to authorize it." },
  404: { phrase: "Not Found", detail: "Requested resource could not be found." },
  409: { phrase: "Conflict", detail: "Request conflicts with the current state of the resource." },
  422: { phrase: "Unprocessable Content", detail: "Request format is valid but semantic validation failed." },
  429: { phrase: "Too Many Requests", detail: "Rate limit exceeded; retry later." },
  500: { phrase: "Internal Server Error", detail: "Unexpected server-side error occurred." },
  502: { phrase: "Bad Gateway", detail: "Server acting as gateway got an invalid upstream response." },
  503: { phrase: "Service Unavailable", detail: "Server is temporarily unable to handle request." },
  504: { phrase: "Gateway Timeout", detail: "Gateway did not receive timely response from upstream." }
};

function categoryFromCode(code) {
  if (code >= 100 && code < 200) return "Informational";
  if (code >= 200 && code < 300) return "Success";
  if (code >= 300 && code < 400) return "Redirection";
  if (code >= 400 && code < 500) return "Client Error";
  if (code >= 500 && code < 600) return "Server Error";
  return "Unknown";
}

function parseCode(value) {
  if (!/^\d{3}$/.test(value)) {
    throw new Error(`Invalid HTTP status code: ${value}`);
  }
  return Number(value);
}

function lookupCode(code) {
  const entry = STATUS_MAP[code];
  const category = categoryFromCode(code);
  if (!entry) {
    return `${code} Unknown\nCategory: ${category}\nMeaning: Not present in bundled lookup set.`;
  }
  return `${code} ${entry.phrase}\nCategory: ${category}\nMeaning: ${entry.detail}`;
}

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

  const value = String(input || "").trim();
  if (!value) {
    throw new Error("Input cannot be empty.");
  }

  if (mode === "lookup-single") {
    return lookupCode(parseCode(value));
  }

  if (mode === "lookup-batch") {
    const items = value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.length) {
      throw new Error("No status codes provided.");
    }
    return items.map((item) => lookupCode(parseCode(item))).join("\n\n");
  }

  throw new Error("Unsupported mode.");
}
