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
const liveToolTilesEl = document.querySelector("#liveToolTiles");
const plannedToolTilesEl = document.querySelector("#plannedToolTiles");
const catalogStatsEl = document.querySelector("#catalogStats");

const MIN_UPCOMING_TILES = 3;
const FALLBACK_PLANNED_TOOLS = [
  "HTTP Header Diff Checker",
  "JWT Expiry Inspector",
  "Cron Expression Translator",
  "URL Query Param Diff",
  "Regex Explain Assistant",
  "OpenAPI Endpoint Snippet Builder"
];

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

function formatCountdown(value) {
  const target = new Date(`${value}T09:00:00Z`);
  if (Number.isNaN(target.getTime())) {
    return "TBD";
  }

  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return "Launching now";
  }

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `T-${days}d ${remHours}h`;
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

function toIsoDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function addDaysIso(baseDateIso, daysToAdd) {
  const base = new Date(`${baseDateIso}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) {
    return "";
  }
  base.setUTCDate(base.getUTCDate() + daysToAdd);
  return base.toISOString().slice(0, 10);
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

  if (tool.countdown) {
    const countdown = document.createElement("p");
    countdown.className = "tile-countdown";
    countdown.textContent = tool.countdown;
    tile.appendChild(countdown);
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

function renderTileList(targetEl, tools, emptyMessage) {
  if (!targetEl) {
    return;
  }

  targetEl.innerHTML = "";
  if (!tools.length) {
    targetEl.innerHTML = `<article class="tool-tile tool-tile-empty">${emptyMessage}</article>`;
    return;
  }

  for (const tool of tools) {
    targetEl.appendChild(buildTile(tool));
  }
}

async function loadToolCatalog() {
  if (!liveToolTilesEl || !plannedToolTilesEl || !catalogStatsEl) {
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
    const todayIso = new Date().toISOString().slice(0, 10);

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
            date: "",
            countdown: ""
          }))
        : [])
    ];

    const upcomingToolsFromIssues = Array.isArray(issues)
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
            const launchIso = toIsoDate(upcomingDateFromIssue(item));
            return {
              title: normalizeTitle(extracted, ""),
              summary: "Scheduled by Product Owner automation.",
              url: item.html_url,
              status: state,
              kind: "upcoming",
              date: launchIso ? `Launch ${formatDate(launchIso)}` : "Launch TBD",
              countdown: launchIso ? formatCountdown(launchIso) : "TBD",
              launchIso
            };
          })
      : [];

    const liveNameSet = new Set(liveTools.map((tool) => tool.title.toLowerCase()));
    const upcomingTools = [...upcomingToolsFromIssues];

    let fallbackIndex = 0;
    while (upcomingTools.length < MIN_UPCOMING_TILES && fallbackIndex < 20) {
      const candidateName = FALLBACK_PLANNED_TOOLS[fallbackIndex % FALLBACK_PLANNED_TOOLS.length];
      const lower = candidateName.toLowerCase();
      fallbackIndex += 1;

      if (liveNameSet.has(lower) || upcomingTools.some((tool) => tool.title.toLowerCase() === lower)) {
        continue;
      }

      const launchIso = addDaysIso(todayIso, upcomingTools.length + 1);
      upcomingTools.push({
        title: candidateName,
        summary: "Planned by the daily roadmap.",
        url: "",
        status: "Planned",
        kind: "upcoming",
        date: `Launch ${formatDate(launchIso)}`,
        countdown: formatCountdown(launchIso),
        launchIso
      });
    }

    upcomingTools.sort((a, b) => {
      if (!a.launchIso) return 1;
      if (!b.launchIso) return -1;
      return a.launchIso.localeCompare(b.launchIso);
    });

    catalogStatsEl.textContent = `${liveTools.length} live tools | ${upcomingTools.length} planned tools`;
    renderTileList(liveToolTilesEl, liveTools, "No live tools found.");
    renderTileList(plannedToolTilesEl, upcomingTools, "No planned tools found.");
  } catch {
    catalogStatsEl.textContent = "Could not load catalog stats.";
    renderTileList(liveToolTilesEl, [], "Could not load live tools.");
    renderTileList(plannedToolTilesEl, [], "Could not load planned tools.");
  }
}

loadToolCatalog();
