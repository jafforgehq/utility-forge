export const TOOL_NAME = `[Product Owner] Daily Tool Idea 2026-02-27`;
export const TOOL_SUMMARY = `Convert UTF-8 text between Base64 and URL-safe Base64 formats.`;
export const SAMPLE_INPUT = `Hello Utility Forge`;
export const MODES = [
  {
    "value": "encode",
    "label": "Encode URL-safe Base64"
  },
  {
    "value": "decode",
    "label": "Decode URL-safe Base64"
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
  const encodeUtf8ToBase64 = (text) => {
    if (typeof btoa === 'function') {
      return btoa(unescape(encodeURIComponent(text)));
    }
    return Buffer.from(text, 'utf8').toString('base64');
  };
  const decodeBase64ToUtf8 = (text) => {
    if (typeof atob === 'function') {
      return decodeURIComponent(escape(atob(text)));
    }
    return Buffer.from(text, 'base64').toString('utf8');
  };
  if (mode === 'encode') {
    const base64 = encodeUtf8ToBase64(value);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  if (mode === 'decode') {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    try {
      return decodeBase64ToUtf8(normalized + padding);
    } catch {
      throw new Error('Input is not valid URL-safe Base64 text.');
    }
  }
  throw new Error('Unsupported mode.');
}
