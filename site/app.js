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
const toolTilesEl = document.querySelector("#toolTiles");

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

function extractToolNameFromIssue(body, fallback = "Upcoming Tool") {
  const match = String(body || "").match(/## Tool\s*([\s\S]*?)(\n## |\n---|$)/i);
  if (!match || !match[1]) {
    return fallback;
  }

  const name = match[1]
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return name || fallback;
}

function normalizeTitle(title, summary) {
  let normalized = String(title || "").trim();
  while (/^\[[^\]]+\]\s*/.test(normalized)) {
    normalized = normalized.replace(/^\[[^\]]+\]\s*/, "").trim();
  }

  normalized = normalized.replace(/\(launch\s+\d{4}-\d{2}-\d{2}\)$/i, "").trim();

  if (/daily tool idea \d{4}-\d{2}-\d{2}/i.test(normalized) && /base64/i.test(summary || "")) {
    return "Base64 / URL-safe Converter";
  }

  return normalized || "Developer Tool";
}

function inferRepoFromLocation() {
  const host = window.location.hostname;
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (host.endsWith(".github.io") && segments.length > 0) {
    return { owner: host.split(".")[0], repo: segments[0] };
  }

  return { owner: "jafforgehq", repo: "utility-forge" };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function upcomingDateFromIssue(issue) {
  const launchMatch = String(issue.body || "").match(/## Launch Date\s*([\s\S]*?)(\n## |\n---|$)/i);
  if (launchMatch && launchMatch[1]) {
    const line = launchMatch[1]
      .split("\n")
      .map((item) => item.trim())
      .find(Boolean);
    if (line) {
      return line;
    }
  }

  const match = String(issue.title || "").match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (match && match[1]) {
    return match[1];
  }
  return issue.created_at || "";
}

function buildTile(tool) {
  const tile = document.createElement("article");
  tile.className = `tool-tile ${tool.kind}`;

  const heading = document.createElement("h3");
  if (tool.url) {
    const link = document.createElement("a");
    link.href = tool.url;
    link.textContent = tool.title;
    link.rel = "noopener noreferrer";
    heading.appendChild(link);
  } else {
    heading.textContent = tool.title;
  }
  tile.appendChild(heading);

  if (tool.summary) {
    const summary = document.createElement("p");
    summary.textContent = tool.summary;
    tile.appendChild(summary);
  }

  const meta = document.createElement("div");
  meta.className = "tool-tile-meta";

  const status = document.createElement("span");
  status.className = `tile-status ${tool.kind}`;
  status.textContent = tool.status;
  meta.appendChild(status);

  if (tool.date) {
    const date = document.createElement("span");
    date.className = "tile-date";
    date.textContent = tool.date;
    meta.appendChild(date);
  }

  tile.appendChild(meta);
  return tile;
}

async function loadToolCatalog() {
  if (!toolTilesEl) {
    return;
  }

  try {
    const repo = inferRepoFromLocation();
    const [generatedResp, upcomingResp] = await Promise.all([
      fetch("./generated-tools.json", { cache: "no-store" }),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/issues?state=open&labels=type:tool&per_page=100`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      )
    ]);

    if (!generatedResp.ok) {
      throw new Error(`Generated tools fetch failed (${generatedResp.status}).`);
    }

    const generated = await generatedResp.json();
    const issues = upcomingResp.ok ? await upcomingResp.json() : [];

    const liveTools = [
      {
        title: "JSON Formatter / Minifier / Key Sorter",
        summary: "Format, minify, sort keys, and copy JSON instantly in browser.",
        url: "#tool-title",
        status: "Live",
        kind: "live",
        date: ""
      },
      ...(Array.isArray(generated)
        ? generated.map((tool) => ({
            title: normalizeTitle(tool.title, tool.summary),
            summary: tool.summary || "",
            url: tool.path || "",
            status: "Live",
            kind: "live",
            date: ""
          }))
        : [])
    ];

    const upcomingTools = Array.isArray(issues)
      ? issues
          .filter((item) => !item.pull_request)
          .filter((item) => {
            const labels = item.labels.map((label) => label.name);
            return !labels.includes("status:done");
          })
          .map((item) => {
            const labels = item.labels.map((label) => label.name);
            let state = "Upcoming";
            if (labels.includes("status:in-progress")) {
              state = "In Progress";
            } else if (labels.includes("status:qa-review")) {
              state = "QA Review";
            } else if (labels.includes("status:ready-for-engineering")) {
              state = "Ready";
            }

            const extracted = extractToolNameFromIssue(item.body, item.title);
            return {
              title: normalizeTitle(extracted, ""),
              summary: "Scheduled by Product Owner automation.",
              url: item.html_url,
              status: state,
              kind: "upcoming",
              date: `Target ${formatDate(upcomingDateFromIssue(item))}`
            };
          })
      : [];

    const seen = new Set();
    const allTools = [...liveTools, ...upcomingTools].filter((tool) => {
      const key = `${tool.kind}:${tool.title.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    toolTilesEl.innerHTML = "";

    if (allTools.length === 0) {
      toolTilesEl.innerHTML = '<article class="tool-tile tool-tile-empty">No tools found.</article>';
      return;
    }

    for (const tool of allTools) {
      toolTilesEl.appendChild(buildTile(tool));
    }
  } catch {
    toolTilesEl.innerHTML =
      '<article class="tool-tile tool-tile-empty">Could not load tool catalog.</article>';
  }
}

loadToolCatalog();
