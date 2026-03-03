export const TOOL_NAME = `Convert curl command -> fetch snippet generator`;
export const TOOL_SUMMARY = `Convert common curl commands into JavaScript fetch snippets for quick API testing and docs.`;
export const SAMPLE_INPUT = `curl -X POST "https://api.example.com/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Ava","role":"po"}'`;
export const MODES = [
  {
    "value": "fetch-snippet",
    "label": "Generate fetch snippet"
  },
  {
    "value": "request-init",
    "label": "Generate request init object"
  }
];

function tokenizeShell(input) {
  const normalized = String(input || "").replace(/\\\r?\n/g, " ");
  const tokens = [];
  let current = "";
  let quote = "";

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (quote) {
      if (ch === quote) {
        quote = "";
      } else if (ch === "\\" && i + 1 < normalized.length) {
        i += 1;
        current += normalized[i];
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    if (ch === "\\" && i + 1 < normalized.length) {
      i += 1;
      current += normalized[i];
      continue;
    }

    current += ch;
  }

  if (quote) {
    throw new Error("Unclosed quote in curl command.");
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}

function parseHeader(headerValue) {
  const splitAt = headerValue.indexOf(":");
  if (splitAt <= 0) {
    throw new Error(`Invalid header format: ${headerValue}`);
  }
  const key = headerValue.slice(0, splitAt).trim();
  const value = headerValue.slice(splitAt + 1).trim();
  if (!key) {
    throw new Error(`Invalid header key: ${headerValue}`);
  }
  return [key, value];
}

function parseCurl(command) {
  const tokens = tokenizeShell(command);
  if (!tokens.length) {
    throw new Error("Input cannot be empty.");
  }

  let cursor = tokens[0] === "curl" ? 1 : 0;
  let method = "GET";
  let url = "";
  const headers = {};
  const dataParts = [];

  const pullValue = () => {
    cursor += 1;
    if (cursor >= tokens.length) {
      throw new Error("curl command ended unexpectedly.");
    }
    return tokens[cursor];
  };

  for (; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];

    if (token === "-X" || token === "--request") {
      method = pullValue().toUpperCase();
      continue;
    }
    if (token.startsWith("--request=")) {
      method = token.split("=")[1].toUpperCase();
      continue;
    }

    if (token === "-H" || token === "--header") {
      const [key, value] = parseHeader(pullValue());
      headers[key] = value;
      continue;
    }
    if (token.startsWith("--header=")) {
      const [key, value] = parseHeader(token.slice("--header=".length));
      headers[key] = value;
      continue;
    }

    if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-urlencode"
    ) {
      dataParts.push(pullValue());
      if (method === "GET") method = "POST";
      continue;
    }
    if (
      token.startsWith("--data=") ||
      token.startsWith("--data-raw=") ||
      token.startsWith("--data-binary=") ||
      token.startsWith("--data-urlencode=")
    ) {
      dataParts.push(token.slice(token.indexOf("=") + 1));
      if (method === "GET") method = "POST";
      continue;
    }

    if (token === "--url") {
      url = pullValue();
      continue;
    }
    if (token.startsWith("--url=")) {
      url = token.slice("--url=".length);
      continue;
    }

    if (token === "-I" || token === "--head") {
      method = "HEAD";
      continue;
    }

    if (
      token === "--compressed" ||
      token === "-s" ||
      token === "--silent" ||
      token === "-S" ||
      token === "--show-error" ||
      token === "-L" ||
      token === "--location" ||
      token === "-k" ||
      token === "--insecure"
    ) {
      continue;
    }

    if (/^-/.test(token)) {
      continue;
    }

    if (!url && /^https?:\/\//i.test(token)) {
      url = token;
      continue;
    }
    if (!url) {
      url = token;
    }
  }

  if (!url) {
    throw new Error("No URL found in curl command.");
  }

  const body = dataParts.length ? dataParts.join("&") : "";
  return { method, url, headers, body };
}

function toRequestOptions(parsed) {
  const options = {};
  if (parsed.method && parsed.method !== "GET") {
    options.method = parsed.method;
  }
  if (Object.keys(parsed.headers).length) {
    options.headers = parsed.headers;
  }
  if (parsed.body && !["GET", "HEAD"].includes(parsed.method)) {
    options.body = parsed.body;
  }
  return options;
}

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

  const parsed = parseCurl(input.trim());
  const options = toRequestOptions(parsed);

  if (mode === "request-init") {
    return `const requestOptions = ${JSON.stringify(options, null, 2)};`;
  }

  if (mode === "fetch-snippet") {
    return [
      `const requestOptions = ${JSON.stringify(options, null, 2)};`,
      "",
      `const response = await fetch(${JSON.stringify(parsed.url)}, requestOptions);`,
      "const text = await response.text();",
      "console.log(text);"
    ].join("\n");
  }

  throw new Error("Unsupported mode.");
}
