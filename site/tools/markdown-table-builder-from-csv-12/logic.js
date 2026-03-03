export const TOOL_NAME = `Markdown table builder from CSV`;
export const TOOL_SUMMARY = `Convert CSV or TSV rows into clean Markdown tables for docs and pull requests.`;
export const SAMPLE_INPUT = `name,role,team
Ava,PO,Platform
Eve,SE,Platform
Nora,QA,Platform`;
export const MODES = [
  {
    "value": "csv-comma",
    "label": "CSV (comma)"
  },
  {
    "value": "tsv-tab",
    "label": "TSV (tab)"
  }
];

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (inQuotes) {
    throw new Error("Unclosed quote found in table input.");
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((cells) => cells.map((value) => String(value || "").trim()))
    .filter((cells) => cells.some((value) => value.length > 0));
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function runTool(input, mode = MODES[0]?.value || "default") {
  if (typeof input !== "string") {
    throw new Error("Input must be a string.");
  }

  const value = String(input || "").trim();
  if (!value) {
    throw new Error("Input cannot be empty.");
  }

  const delimiter = mode === "tsv-tab" ? "\t" : mode === "csv-comma" ? "," : "";
  if (!delimiter) {
    throw new Error("Unsupported mode.");
  }

  const rows = parseDelimited(value, delimiter);
  if (rows.length < 2) {
    throw new Error("At least a header row and one data row are required.");
  }

  const width = Math.max(...rows.map((cells) => cells.length));
  const normalized = rows.map((cells) => {
    const copy = [...cells];
    while (copy.length < width) {
      copy.push("");
    }
    return copy.map(escapeCell);
  });

  const header = normalized[0];
  const divider = new Array(width).fill("---");
  const body = normalized.slice(1);

  return [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...body.map((cells) => `| ${cells.join(" | ")} |`)
  ].join("\n");
}
