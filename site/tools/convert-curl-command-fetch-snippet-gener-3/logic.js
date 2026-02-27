export const TOOL_NAME = `Convert curl command -> fetch snippet generator`;
export const TOOL_SUMMARY = `Normalize and sort lines of text for quick developer cleanup tasks.`;
export const SAMPLE_INPUT = `zeta
alpha
alpha   beta`;
export const MODES = [
  {
    "value": "normalize",
    "label": "Normalize whitespace"
  },
  {
    "value": "sort-lines",
    "label": "Sort lines"
  }
];

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

  const value = input.trim();
  if (!value) {
    throw new Error('Input cannot be empty.');
  }
  if (mode === 'normalize') {
    return value.replace(/\s+/g, ' ').trim();
  }
  if (mode === 'sort-lines') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join('\n');
  }
  throw new Error('Unsupported mode.');
}
