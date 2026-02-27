import { countChars, formatJson, minifyJson, sortJsonKeys } from "./json-tools.js";

const inputEl = document.querySelector("#jsonInput");
const outputEl = document.querySelector("#jsonOutput");
const statusEl = document.querySelector("#status");
const statsEl = document.querySelector("#stats");

const formatBtn = document.querySelector("#formatBtn");
const minifyBtn = document.querySelector("#minifyBtn");
const sortBtn = document.querySelector("#sortBtn");
const copyBtn = document.querySelector("#copyBtn");
const swapBtn = document.querySelector("#swapBtn");

const sample = `{
  "tool": "utility-forge",
  "features": ["format", "minify", "sort-keys"],
  "roles": {
    "productOwner": true,
    "softwareEngineer": true,
    "qa": true
  }
}`;

inputEl.value = sample;

function setStatus(message, state) {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setStats(input, output) {
  statsEl.textContent = `Input chars: ${countChars(input)} | Output chars: ${countChars(output)}`;
}

function run(transform) {
  const current = inputEl.value;

  try {
    const result = transform(current);
    outputEl.value = result;
    setStatus("Success.", "ok");
    setStats(current, result);
  } catch (error) {
    outputEl.value = "";
    setStatus(error.message, "error");
    setStats(current, "");
  }
}

formatBtn.addEventListener("click", () => run((value) => formatJson(value, 2)));
minifyBtn.addEventListener("click", () => run(minifyJson));
sortBtn.addEventListener("click", () => run((value) => sortJsonKeys(value, 2)));

copyBtn.addEventListener("click", async () => {
  if (!outputEl.value) {
    setStatus("Nothing to copy.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(outputEl.value);
    setStatus("Output copied to clipboard.", "ok");
  } catch {
    setStatus("Clipboard write failed.", "error");
  }
});

swapBtn.addEventListener("click", () => {
  if (!outputEl.value) {
    setStatus("Run a transform first.", "error");
    return;
  }

  inputEl.value = outputEl.value;
  setStatus("Output moved to input.", "ok");
  setStats(inputEl.value, outputEl.value);
});

setStatus("Ready.", "ok");
setStats(inputEl.value, outputEl.value);

