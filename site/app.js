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
const pipelinePulseTextEl = document.querySelector("#pipelinePulseText");
const pipelineLiveCountEl = document.querySelector("#pipelineLiveCount");
const pipelinePlannedCountEl = document.querySelector("#pipelinePlannedCount");
const nextLaunchMetricEl = document.querySelector("#nextLaunchMetric");
const poMetricEl = document.querySelector("#poMetric");
const seMetricEl = document.querySelector("#seMetric");
const qaMetricEl = document.querySelector("#qaMetric");
const deployMetricEl = document.querySelector("#deployMetric");
const pipelineNodeEls = Array.from(document.querySelectorAll(".pipeline-node"));
const activityFeedEl = document.querySelector("#activityFeed");
const activityStatusEl = document.querySelector("#activityStatus");
const healthSyncEl = document.querySelector("#healthSync");
const healthPoRunEl = document.querySelector("#healthPoRun");
const healthSeRunEl = document.querySelector("#healthSeRun");
const healthQaRunEl = document.querySelector("#healthQaRun");
const healthWatchdogRunEl = document.querySelector("#healthWatchdogRun");
const healthNextToolDateEl = document.querySelector("#healthNextToolDate");
let currentActivityItems = [];
let activityClockTimer = null;
let activityRefreshTimer = null;
let isCatalogLoading = false;

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

function getLabelNames(item) {
  return (Array.isArray(item.labels) ? item.labels : [])
    .map((label) => (typeof label === "string" ? label : label.name))
    .filter(Boolean);
}

function normalizeTitle(title) {
  let normalized = String(title || "").trim();
  while (/^\[[^\]]+\]\s*/.test(normalized)) {
    normalized = normalized.replace(/^\[[^\]]+\]\s*/, "").trim();
  }

  normalized = normalized.replace(/\(launch\s+\d{4}-\d{2}-\d{2}\)$/i, "").trim();

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

function dateToMs(value) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimeAgo(value) {
  const timeMs = dateToMs(value);
  if (!timeMs) {
    return "just now";
  }

  const diffMs = Date.now() - timeMs;
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);
  if (absSeconds < 60) {
    return "just now";
  }

  const absMinutes = Math.floor(absSeconds / 60);
  if (absMinutes < 60) {
    return `${absMinutes}m ago`;
  }

  const absHours = Math.floor(absMinutes / 60);
  if (absHours < 24) {
    return `${absHours}h ago`;
  }

  const absDays = Math.floor(absHours / 24);
  return `${absDays}d ago`;
}

function workflowRunSummary(run) {
  if (!run) {
    return { text: "No runs yet", tone: "warn" };
  }

  const timeText = formatTimeAgo(run.updated_at || run.created_at);
  if (run.status !== "completed") {
    const status = String(run.status || "running").replace(/_/g, " ");
    return { text: `${status} • ${timeText}`, tone: "info" };
  }

  if (run.conclusion === "success") {
    return { text: `Success • ${timeText}`, tone: "success" };
  }

  if (run.conclusion === "skipped" || run.conclusion === "neutral") {
    return { text: `Skipped • ${timeText}`, tone: "warn" };
  }

  return { text: `Failed • ${timeText}`, tone: "error" };
}

function setHealthValue(targetEl, summary) {
  if (!targetEl) {
    return;
  }
  targetEl.textContent = summary.text;
  targetEl.dataset.tone = summary.tone || "info";
}

function updateHealthSnapshot(payload) {
  if (
    !healthPoRunEl ||
    !healthSeRunEl ||
    !healthQaRunEl ||
    !healthWatchdogRunEl ||
    !healthNextToolDateEl
  ) {
    return;
  }

  setHealthValue(healthPoRunEl, workflowRunSummary(payload.poRun));
  setHealthValue(healthSeRunEl, workflowRunSummary(payload.seRun));
  setHealthValue(healthQaRunEl, workflowRunSummary(payload.qaRun));
  setHealthValue(healthWatchdogRunEl, workflowRunSummary(payload.watchdogRun));

  const nextIso = payload.nextLaunchIso || "";
  if (nextIso) {
    const countdown = formatCountdown(nextIso);
    healthNextToolDateEl.textContent = `${formatDate(nextIso)} (${countdown})`;
    healthNextToolDateEl.dataset.tone = "info";
  } else {
    healthNextToolDateEl.textContent = "TBD";
    healthNextToolDateEl.dataset.tone = "warn";
  }

  if (healthSyncEl) {
    healthSyncEl.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  }
}

function formatAbsoluteTime(value) {
  const timeMs = dateToMs(value);
  if (!timeMs) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timeMs));
}

function formatActivityMeta(item) {
  return `${item.source} • ${formatTimeAgo(item.when)}`;
}

function refreshActivityMetaTimes() {
  if (!activityFeedEl || !currentActivityItems.length) {
    return;
  }

  const metaEls = activityFeedEl.querySelectorAll(".activity-meta[data-activity-index]");
  for (const metaEl of metaEls) {
    const index = Number(metaEl.dataset.activityIndex);
    const item = currentActivityItems[index];
    if (!item) {
      continue;
    }
    metaEl.textContent = formatActivityMeta(item);
  }
}

function activityFromIssue(issue) {
  const labels = getLabelNames(issue);
  const toolName = normalizeTitle(extractToolNameFromIssue(issue.body, issue.title));
  let title = `Issue updated: ${toolName}`;
  let tone = "info";

  if (issue.state === "closed" || labels.includes("status:done")) {
    title = `Tool shipped: ${toolName}`;
    tone = "success";
  } else if (labels.includes("status:qa-review")) {
    title = `QA reviewing: ${toolName}`;
    tone = "warn";
  } else if (labels.includes("status:in-progress")) {
    title = `Engineering in progress: ${toolName}`;
    tone = "info";
  } else if (labels.includes("status:ready-for-engineering")) {
    title = `Idea queued: ${toolName}`;
    tone = "info";
  }

  const when = issue.updated_at || issue.created_at;
  return {
    id: `issue-${issue.id || issue.number}`,
    title,
    detail: `Issue #${issue.number}`,
    source: "Issue",
    tone,
    url: issue.html_url || "",
    when,
    timeMs: dateToMs(when)
  };
}

function activityFromPull(pr) {
  const name = normalizeTitle(pr.title);
  let title = `PR updated: ${name}`;
  let tone = "info";
  let when = pr.updated_at || pr.created_at;

  if (pr.merged_at) {
    title = `PR merged: ${name}`;
    tone = "success";
    when = pr.merged_at;
  } else if (pr.state === "open") {
    title = `PR opened: ${name}`;
    tone = "info";
    when = pr.created_at || when;
  } else if (pr.state === "closed") {
    title = `PR closed: ${name}`;
    tone = "warn";
  }

  return {
    id: `pr-${pr.id || pr.number}`,
    title,
    detail: `PR #${pr.number}`,
    source: "Pull Request",
    tone,
    url: pr.html_url || "",
    when,
    timeMs: dateToMs(when)
  };
}

function activityFromWorkflowRun(run, workflowLabel) {
  let title = `${workflowLabel} run started`;
  let tone = "info";

  if (run.status === "completed") {
    if (run.conclusion === "success") {
      title = `${workflowLabel} run succeeded`;
      tone = "success";
    } else if (run.conclusion === "skipped") {
      title = `${workflowLabel} run skipped`;
      tone = "warn";
    } else {
      title = `${workflowLabel} run failed`;
      tone = "error";
    }
  }

  const when = run.updated_at || run.created_at;
  return {
    id: `${workflowLabel}-${run.id}`,
    title,
    detail: `Trigger: ${run.event || "unknown"}`,
    source: "Workflow",
    tone,
    url: run.html_url || "",
    when,
    timeMs: dateToMs(when)
  };
}

function renderActivityFeed(items) {
  if (!activityFeedEl) {
    return;
  }

  currentActivityItems = Array.isArray(items) ? items : [];
  activityFeedEl.innerHTML = "";
  if (!currentActivityItems.length) {
    activityFeedEl.innerHTML =
      '<article class="activity-item activity-item-empty">No recent activity available.</article>';
    return;
  }

  for (const [index, item] of currentActivityItems.entries()) {
    const article = document.createElement("article");
    article.className = `activity-item activity-${item.tone}`;
    article.style.setProperty("--activity-delay", `${index * 55}ms`);

    const body = document.createElement("div");
    body.className = "activity-body";

    const meta = document.createElement("p");
    meta.className = "activity-meta";
    meta.dataset.activityIndex = String(index);
    meta.textContent = formatActivityMeta(item);
    const absolute = formatAbsoluteTime(item.when);
    if (absolute) {
      meta.title = absolute;
    }
    body.appendChild(meta);

    const title = document.createElement("h3");
    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.title;
      link.rel = "noopener noreferrer";
      title.appendChild(link);
    } else {
      title.textContent = item.title;
    }
    body.appendChild(title);

    const detail = document.createElement("p");
    detail.className = "activity-detail";
    detail.textContent = item.detail;
    body.appendChild(detail);

    article.appendChild(body);
    activityFeedEl.appendChild(article);
  }

  if (!activityClockTimer) {
    activityClockTimer = window.setInterval(refreshActivityMetaTimes, 30000);
  }

  refreshActivityMetaTimes();
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

function updatePipelineStats(liveTools, upcomingTools) {
  const liveCount = liveTools.length;
  const plannedCount = upcomingTools.length;
  const engineeringQueue = upcomingTools.filter(
    (tool) => tool.status === "Ready" || tool.status === "In Progress"
  ).length;
  const qaQueue = upcomingTools.filter((tool) => tool.status === "QA Review").length;
  const nextLaunch = upcomingTools.find((tool) => tool.launchIso);

  if (pipelineLiveCountEl) {
    pipelineLiveCountEl.textContent = String(liveCount);
  }

  if (pipelinePlannedCountEl) {
    pipelinePlannedCountEl.textContent = String(plannedCount);
  }

  if (nextLaunchMetricEl) {
    nextLaunchMetricEl.textContent = nextLaunch
      ? `Next launch: ${formatDate(nextLaunch.launchIso)} (${formatCountdown(nextLaunch.launchIso)})`
      : "Next launch: TBD";
  }

  if (poMetricEl) {
    poMetricEl.textContent = "Rate: 1 idea/day";
  }

  if (seMetricEl) {
    seMetricEl.textContent = `Queue: ${engineeringQueue}`;
  }

  if (qaMetricEl) {
    qaMetricEl.textContent = `In QA: ${qaQueue}`;
  }

  if (deployMetricEl) {
    deployMetricEl.textContent = `Live tools: ${liveCount}`;
  }
}

function startPipelineAnimation() {
  if (!pipelineNodeEls.length) {
    return;
  }

  const stageMessages = [
    "Product Owner drafting the next tool idea",
    "Software Engineer generating implementation and PR",
    "QA validating tests and acceptance criteria",
    "Deploy publishing approved tools to GitHub Pages"
  ];

  let stageIndex = 0;
  const tick = () => {
    pipelineNodeEls.forEach((node) => node.classList.remove("is-active"));
    pipelineNodeEls[stageIndex].classList.add("is-active");
    if (pipelinePulseTextEl) {
      pipelinePulseTextEl.textContent = stageMessages[stageIndex];
    }
    stageIndex = (stageIndex + 1) % pipelineNodeEls.length;
  };

  tick();
  setInterval(tick, 2200);
}

async function loadToolCatalog() {
  if (!liveToolTilesEl || !plannedToolTilesEl || !catalogStatsEl) {
    return;
  }
  if (isCatalogLoading) {
    return;
  }

  isCatalogLoading = true;

  try {
    const repo = inferRepoFromLocation();
    const [
      generatedResp,
      issuesResp,
      pullsResp,
      poRunsResp,
      seRunsResp,
      qaRunsResp,
      watchdogRunsResp,
      pagesRunsResp
    ] = await Promise.all([
      fetch("./generated-tools.json", { cache: "no-store" }),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/issues?state=all&labels=type:tool&sort=updated&direction=desc&per_page=100`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls?state=all&sort=updated&direction=desc&per_page=40`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/daily-product-owner.yml/runs?per_page=8`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/software-engineer.yml/runs?per_page=8`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/qa-review.yml/runs?per_page=8`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/pipeline-watchdog.yml/runs?per_page=8`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      ),
      fetch(
        `https://api.github.com/repos/${repo.owner}/${repo.repo}/actions/workflows/pages.yml/runs?per_page=8`,
        {
          headers: { Accept: "application/vnd.github+json" }
        }
      )
    ]);

    if (!generatedResp.ok) {
      throw new Error(`Generated tools fetch failed (${generatedResp.status}).`);
    }

    const generated = await generatedResp.json();
    const allToolIssues = issuesResp.ok ? await issuesResp.json() : [];
    const pulls = pullsResp.ok ? await pullsResp.json() : [];
    const poRuns = poRunsResp.ok ? (await poRunsResp.json()).workflow_runs || [] : [];
    const seRuns = seRunsResp.ok ? (await seRunsResp.json()).workflow_runs || [] : [];
    const qaRuns = qaRunsResp.ok ? (await qaRunsResp.json()).workflow_runs || [] : [];
    const watchdogRuns = watchdogRunsResp.ok ? (await watchdogRunsResp.json()).workflow_runs || [] : [];
    const pagesRuns = pagesRunsResp.ok ? (await pagesRunsResp.json()).workflow_runs || [] : [];
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
            title: normalizeTitle(tool.title),
            summary: tool.summary || "",
            url: tool.path || "",
            status: "Live",
            kind: "live",
            date: "",
            countdown: ""
          }))
        : [])
    ];

    const upcomingToolsFromIssues = Array.isArray(allToolIssues)
      ? allToolIssues
          .filter((item) => item.state === "open")
          .filter((item) => !item.pull_request)
          .filter((item) => {
            const labels = getLabelNames(item);
            return !labels.includes("status:done");
          })
          .map((item) => {
            const labels = getLabelNames(item);
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
              title: normalizeTitle(extracted),
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
    updatePipelineStats(liveTools, upcomingTools);
    updateHealthSnapshot({
      poRun: poRuns[0] || null,
      seRun: seRuns[0] || null,
      qaRun: qaRuns[0] || null,
      watchdogRun: watchdogRuns[0] || null,
      nextLaunchIso: (upcomingTools.find((tool) => tool.launchIso) || {}).launchIso || addDaysIso(todayIso, 1)
    });

    const activityItems = [
      ...(Array.isArray(allToolIssues)
        ? allToolIssues.filter((item) => !item.pull_request).slice(0, 8).map(activityFromIssue)
        : []),
      ...(Array.isArray(pulls) ? pulls.slice(0, 8).map(activityFromPull) : []),
      ...poRuns.slice(0, 3).map((run) => activityFromWorkflowRun(run, "Product Owner")),
      ...seRuns.slice(0, 5).map((run) => activityFromWorkflowRun(run, "Software Engineer")),
      ...qaRuns.slice(0, 5).map((run) => activityFromWorkflowRun(run, "QA")),
      ...watchdogRuns.slice(0, 3).map((run) => activityFromWorkflowRun(run, "Watchdog")),
      ...pagesRuns.slice(0, 5).map((run) => activityFromWorkflowRun(run, "Deploy"))
    ]
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 12);

    renderActivityFeed(activityItems);
    if (activityStatusEl) {
      activityStatusEl.textContent = "Live GitHub activity";
    }
  } catch {
    catalogStatsEl.textContent = "Could not load catalog stats.";
    renderTileList(liveToolTilesEl, [], "Could not load live tools.");
    renderTileList(plannedToolTilesEl, [], "Could not load planned tools.");
    updatePipelineStats([], []);
    updateHealthSnapshot({
      poRun: null,
      seRun: null,
      qaRun: null,
      watchdogRun: null,
      nextLaunchIso: ""
    });
    renderActivityFeed([]);
    if (activityStatusEl) {
      activityStatusEl.textContent = "Activity sync unavailable";
    }
    if (healthSyncEl) {
      healthSyncEl.textContent = "Health sync unavailable";
    }
  } finally {
    isCatalogLoading = false;
  }
}

startPipelineAnimation();
loadToolCatalog();
if (!activityRefreshTimer) {
  activityRefreshTimer = window.setInterval(loadToolCatalog, 120000);
}
