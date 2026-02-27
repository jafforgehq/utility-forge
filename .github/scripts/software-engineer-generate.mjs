import fs from "node:fs";
import path from "node:path";

const issueNumber = process.env.ISSUE_NUMBER;
const toolName = process.env.TOOL_NAME;
const toolSlug = process.env.TOOL_SLUG;
const issueBody = process.env.ISSUE_BODY || "";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY || "";

if (!issueNumber || !toolName || !toolSlug) {
  throw new Error("Missing ISSUE_NUMBER, TOOL_NAME, or TOOL_SLUG.");
}

const root = process.cwd();
const toolDir = path.join(root, "site", "tools", toolSlug);
const testPath = path.join(root, "test", `generated-${toolSlug}.test.mjs`);
const registryPath = path.join(root, "site", "generated-tools.json");

function sanitizeForJs(text) {
  return String(text || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${")
    .trim();
}

function sanitizeForHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fallbackSpec(name) {
  const isBase64 = /base64|url[- ]?safe/i.test(name) || /base64|url[- ]?safe/i.test(issueBody);

  if (isBase64) {
    return {
      summary: "Convert UTF-8 text between Base64 and URL-safe Base64 formats.",
      sample_input: "Hello Utility Forge",
      modes: [
        { value: "encode", label: "Encode URL-safe Base64" },
        { value: "decode", label: "Decode URL-safe Base64" }
      ],
      logic: [
        "const value = input.trim();",
        "if (!value) {",
        "  throw new Error('Input cannot be empty.');",
        "}",
        "const encodeUtf8ToBase64 = (text) => {",
        "  if (typeof btoa === 'function') {",
        "    return btoa(unescape(encodeURIComponent(text)));",
        "  }",
        "  return Buffer.from(text, 'utf8').toString('base64');",
        "};",
        "const decodeBase64ToUtf8 = (text) => {",
        "  if (typeof atob === 'function') {",
        "    return decodeURIComponent(escape(atob(text)));",
        "  }",
        "  return Buffer.from(text, 'base64').toString('utf8');",
        "};",
        "if (mode === 'encode') {",
        "  const base64 = encodeUtf8ToBase64(value);",
        "  return base64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');",
        "}",
        "if (mode === 'decode') {",
        "  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');",
        "  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));",
        "  try {",
        "    return decodeBase64ToUtf8(normalized + padding);",
        "  } catch {",
        "    throw new Error('Input is not valid URL-safe Base64 text.');",
        "  }",
        "}",
        "throw new Error('Unsupported mode.');"
      ].join("\n")
    };
  }

  return {
    summary: "Normalize and sort lines of text for quick developer cleanup tasks.",
    sample_input: "zeta\nalpha\nalpha   beta",
    modes: [
      { value: "normalize", label: "Normalize whitespace" },
      { value: "sort-lines", label: "Sort lines" }
    ],
    logic: [
      "const value = input.trim();",
      "if (!value) {",
      "  throw new Error('Input cannot be empty.');",
      "}",
      "if (mode === 'normalize') {",
      "  return value.replace(/\\s+/g, ' ').trim();",
      "}",
      "if (mode === 'sort-lines') {",
      "  return value",
      "    .split(/\\r?\\n/)",
      "    .map((line) => line.trim())",
      "    .filter(Boolean)",
      "    .sort((a, b) => a.localeCompare(b))",
      "    .join('\\n');",
      "}",
      "throw new Error('Unsupported mode.');"
    ].join("\n")
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return "";
}

async function generateSpecWithOpenAI(name, body) {
  if (!apiKey) {
    return null;
  }

  const prompt = [
    "Create practical transform logic for a developer utility.",
    "Return JSON only with keys: summary, sample_input, modes, logic.",
    "Rules:",
    "- modes: array of 1-3 objects {value,label}.",
    "- logic: JavaScript body for function runTool(input, mode).",
    "- logic must return a string and throw Error for invalid input.",
    "- no markdown fences, no comments, ASCII only.",
    "",
    `Tool name: ${name}`,
    "Issue body:",
    body
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are a senior JavaScript engineer. Always respond with valid JSON object only."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content || "";
  const jsonText = extractJson(raw);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText);
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      typeof parsed.sample_input !== "string" ||
      !Array.isArray(parsed.modes) ||
      parsed.modes.length === 0 ||
      typeof parsed.logic !== "string"
    ) {
      return null;
    }

    const modes = parsed.modes
      .map((modeItem) => ({
        value: String(modeItem.value || "").trim(),
        label: String(modeItem.label || "").trim()
      }))
      .filter((modeItem) => modeItem.value && modeItem.label);

    if (modes.length === 0) {
      return null;
    }

    return {
      summary: parsed.summary.trim(),
      sample_input: parsed.sample_input,
      modes,
      logic: parsed.logic.trim()
    };
  } catch {
    return null;
  }
}

function buildLogicModule(name, summary, sampleInput, modes, logic) {
  return `export const TOOL_NAME = \`${sanitizeForJs(name)}\`;
export const TOOL_SUMMARY = \`${sanitizeForJs(summary)}\`;
export const SAMPLE_INPUT = \`${sanitizeForJs(sampleInput)}\`;
export const MODES = ${JSON.stringify(modes, null, 2)};

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

${logic
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
}
`;
}

function buildToolHtml(name, summary) {
  const safeName = sanitizeForHtml(name);
  const safeSummary = sanitizeForHtml(summary);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeName} - Utility Forge</title>
    <meta name="description" content="${safeSummary}" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="tool-shell">
      <a class="back-link" href="../../index.html">Back to Utility Forge</a>
      <h1>${safeName}</h1>
      <p id="summary">${safeSummary}</p>

      <label for="modeSelect">Mode</label>
      <select id="modeSelect"></select>

      <label for="toolInput">Input</label>
      <textarea id="toolInput" spellcheck="false"></textarea>

      <label for="toolOutput">Output</label>
      <textarea id="toolOutput" spellcheck="false" readonly></textarea>

      <div class="actions">
        <button id="runBtn" type="button">Run</button>
        <button id="copyBtn" type="button" class="ghost">Copy Output</button>
      </div>

      <p id="status" aria-live="polite">Ready.</p>
    </main>

    <script type="module" src="./app.js"></script>
  </body>
</html>
`;
}

function buildToolCss() {
  return `:root {
  --bg: #0e1215;
  --panel: #19242c;
  --line: #2f4d5b;
  --text: #eaf6fb;
  --muted: #a8c7d6;
  --accent: #5fd1ff;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at 20% 10%, #1a2b34, #0e1215 55%);
  color: var(--text);
  font-family: "Chivo", sans-serif;
}

.tool-shell {
  width: min(860px, 92%);
  margin: 2rem auto;
  padding: 1.2rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(25, 36, 44, 0.92);
}

.back-link {
  color: var(--accent);
  text-decoration: none;
}

h1 {
  margin-bottom: 0.4rem;
}

#summary {
  margin-top: 0;
  color: var(--muted);
}

label {
  display: block;
  margin-top: 0.9rem;
  margin-bottom: 0.25rem;
}

textarea,
select {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--line);
  padding: 0.6rem;
  color: var(--text);
  background: rgba(8, 13, 17, 0.8);
  font-family: "JetBrains Mono", monospace;
}

textarea {
  min-height: 12rem;
  resize: vertical;
}

.actions {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.6rem;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  background: var(--accent);
  color: #0b1a21;
  cursor: pointer;
}

button.ghost {
  background: #24404d;
  color: var(--text);
}

#status {
  margin-top: 0.85rem;
  color: var(--muted);
  font-family: "JetBrains Mono", monospace;
}
`;
}

function buildToolAppJs() {
  return `import { MODES, SAMPLE_INPUT, TOOL_SUMMARY, runTool } from "./logic.js";

const modeSelect = document.querySelector("#modeSelect");
const inputEl = document.querySelector("#toolInput");
const outputEl = document.querySelector("#toolOutput");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const runBtn = document.querySelector("#runBtn");
const copyBtn = document.querySelector("#copyBtn");

summaryEl.textContent = TOOL_SUMMARY;
inputEl.value = SAMPLE_INPUT;

for (const mode of MODES) {
  const option = document.createElement("option");
  option.value = mode.value;
  option.textContent = mode.label;
  modeSelect.appendChild(option);
}

function setStatus(message) {
  statusEl.textContent = message;
}

runBtn.addEventListener("click", () => {
  try {
    const output = runTool(inputEl.value, modeSelect.value);
    outputEl.value = output;
    setStatus("Success.");
  } catch (error) {
    outputEl.value = "";
    setStatus(error.message || "Tool execution failed.");
  }
});

copyBtn.addEventListener("click", async () => {
  if (!outputEl.value) {
    setStatus("Nothing to copy.");
    return;
  }
  try {
    await navigator.clipboard.writeText(outputEl.value);
    setStatus("Output copied.");
  } catch {
    setStatus("Clipboard write failed.");
  }
});

setStatus("Ready.");
`;
}

function buildFallbackTest(slug, modes) {
  const mode = modes[0]?.value || "default";
  return `import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/${slug}/logic.js";

test("generated tool returns output", () => {
  const output = runTool("hello world", "${mode}");
  assert.equal(typeof output, "string");
  assert.ok(output.length > 0);
});

test("generated tool rejects empty input", () => {
  assert.throws(() => runTool("   ", "${mode}"), /empty|invalid/i);
});
`;
}

function buildBase64Test(slug) {
  return `import test from "node:test";
import assert from "node:assert/strict";

import { runTool } from "../site/tools/${slug}/logic.js";

test("base64 tool encodes URL-safe text", () => {
  const encoded = runTool("hello", "encode");
  assert.equal(encoded, "aGVsbG8");
});

test("base64 tool decodes URL-safe text", () => {
  const decoded = runTool("aGVsbG8", "decode");
  assert.equal(decoded, "hello");
});
`;
}

function updateRegistry(slug, name, summary) {
  let registry = [];
  if (fs.existsSync(registryPath)) {
    const raw = fs.readFileSync(registryPath, "utf8").trim();
    if (raw) {
      registry = JSON.parse(raw);
    }
  }

  if (!Array.isArray(registry)) {
    registry = [];
  }

  const exists = registry.some((entry) => entry.slug === slug);
  if (!exists) {
    registry.push({
      slug,
      title: name,
      summary,
      path: `./tools/${slug}/`
    });
  }

  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

function writeFiles(spec) {
  fs.mkdirSync(toolDir, { recursive: true });
  fs.writeFileSync(path.join(toolDir, "index.html"), buildToolHtml(toolName, spec.summary));
  fs.writeFileSync(path.join(toolDir, "styles.css"), buildToolCss());
  fs.writeFileSync(path.join(toolDir, "app.js"), buildToolAppJs());
  fs.writeFileSync(
    path.join(toolDir, "logic.js"),
    buildLogicModule(toolName, spec.summary, spec.sample_input, spec.modes, spec.logic)
  );

  const isBase64 = /base64|url[- ]?safe/i.test(toolName);
  fs.writeFileSync(testPath, isBase64 ? buildBase64Test(toolSlug) : buildFallbackTest(toolSlug, spec.modes));
}

const generatedSpec = await generateSpecWithOpenAI(toolName, issueBody);
const spec = generatedSpec || fallbackSpec(toolName);

writeFiles(spec);
updateRegistry(toolSlug, toolName, spec.summary);

console.log(`Generated tool: ${toolSlug}`);
