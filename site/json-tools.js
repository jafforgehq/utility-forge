function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (isObject(value)) {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = sortDeep(value[key]);
        return acc;
      }, {});
  }

  return value;
}

export function parseJson(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error("Input JSON is empty.");
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

export function formatJson(input, spaces = 2) {
  return JSON.stringify(parseJson(input), null, spaces);
}

export function minifyJson(input) {
  return JSON.stringify(parseJson(input));
}

export function sortJsonKeys(input, spaces = 2) {
  return JSON.stringify(sortDeep(parseJson(input)), null, spaces);
}

export function countChars(input) {
  return typeof input === "string" ? input.length : 0;
}

