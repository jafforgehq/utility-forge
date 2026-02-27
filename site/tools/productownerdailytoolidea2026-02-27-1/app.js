import { MODES, SAMPLE_INPUT, TOOL_SUMMARY, runTool } from "./logic.js";

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
