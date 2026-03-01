const roomTimestampEl = document.querySelector("#roomTimestamp");
const agentGridEl = document.querySelector("#agentGrid");
const leadMetersEl = document.querySelector("#leadMeters");
const replayTimelineEl = document.querySelector("#replayTimeline");
const standupListEl = document.querySelector("#standupList");
const retroListEl = document.querySelector("#retroList");
const celebrateLayerEl = document.querySelector("#celebrateLayer");
const decisionLogLinkEl = document.querySelector("#decisionLogLink");

const AGENTS = {
  ava: {
    id: "ava",
    name: "Ava PO",
    role: "Product Owner",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=AvaPO"
  },
  eve: {
    id: "eve",
    name: "Eve SE",
    role: "Software Engineer",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=EveSE"
  },
  nora: {
    id: "nora",
    name: "Nora QA",
    role: "Quality Assurance",
    avatar: "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=NoraQA"
  }
};

function inferRepoFromLocation() {
  const host = window.location.hostname;
  const segments = window.location.pathname.split("/").filter(Boolean);

  if (host.endsWith(".github.io") && segments.length > 0) {
    return { owner: host.split(".")[0], repo: segments[0] };
  }

  return { owner: "jafforgehq", repo: "utility-forge" };
}

function toMs(value) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAgo(value) {
  const ms = toMs(value);
  if (!ms) return "just now";
  const diff = Math.max(0, Date.now() - ms);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "n/a";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function clampPct(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return 6;
  return Math.min(100, Math.max(8, (hours / 48) * 100));
}

function getLabels(issue) {
  return (Array.isArray(issue.labels) ? issue.labels : [])
    .map((label) => (typeof label === "string" ? label : label.name))
    .filter(Boolean);
}

function parseIssueFromPrBody(bodyText) {
  const match = String(bodyText || "").match(/#(\d+)/);
  return match?.[1] ? Number(match[1]) : 0;
}

function extractSection(bodyText, heading) {
  const regex = new RegExp(`##\\s*${heading}\\s*([\\s\\S]*?)(\\n## |\\n---|$)`, "i");
  const match = String(bodyText || "").match(regex);
  if (!match || !match[1]) return "";
  return match[1].trim();
}

function extractScorecardField(scorecardText, label) {
  const regex = new RegExp(`-\\s*${label}\\s*:\\s*(.+)`, "i");
  const match = String(scorecardText || "").match(regex);
  return match?.[1]?.trim() || "";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" }
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

function renderAgents(payload) {
  if (!agentGridEl) return;
  const {
    readyCount,
    inProgressCount,
    qaCount,
    openPrCount,
    lastQaConclusion,
    lastPoConclusion,
    lastWatchdogConclusion
  } = payload;

  const cards = [
    {
      ...AGENTS.ava,
      copy: `Prioritizing backlog. Ready queue: ${readyCount}.`,
      chips: [
        {
          text: `Last PO: ${lastPoConclusion || "n/a"}`,
          tone:
            lastPoConclusion === "success"
              ? "ok"
              : lastPoConclusion === "failure"
                ? "error"
                : "info"
        },
        { text: `Ready: ${readyCount}`, tone: readyCount ? "warn" : "info" }
      ]
    },
    {
      ...AGENTS.eve,
      copy: `Driving implementation throughput. Open PRs: ${openPrCount}.`,
      chips: [
        { text: `In progress: ${inProgressCount}`, tone: inProgressCount ? "warn" : "info" },
        { text: `Open PRs: ${openPrCount}`, tone: openPrCount ? "ok" : "info" },
        {
          text: `Watchdog: ${lastWatchdogConclusion || "n/a"}`,
          tone:
            lastWatchdogConclusion === "success"
              ? "ok"
              : lastWatchdogConclusion === "failure"
                ? "error"
                : "info"
        }
      ]
    },
    {
      ...AGENTS.nora,
      copy: `Reviewing PR quality and release readiness.`,
      chips: [
        { text: `In QA: ${qaCount}`, tone: qaCount ? "warn" : "ok" },
        {
          text: `Last QA: ${lastQaConclusion || "n/a"}`,
          tone:
            lastQaConclusion === "success"
              ? "ok"
              : lastQaConclusion === "failure"
                ? "error"
                : "info"
        }
      ]
    }
  ];

  agentGridEl.innerHTML = "";
  for (const card of cards) {
    const article = document.createElement("article");
    article.className = "agent-card";
    article.innerHTML = `
      <div class="agent-row">
        <img class="agent-avatar" src="${card.avatar}" alt="${card.name}" />
        <div>
          <p class="agent-name">${card.name}</p>
          <p class="agent-role">${card.role}</p>
        </div>
      </div>
      <div class="chip-list">
        ${card.chips.map((chip) => `<span class="chip ${chip.tone}">${chip.text}</span>`).join("")}
      </div>
      <p class="agent-copy">${card.copy}</p>
    `;
    agentGridEl.appendChild(article);
  }
}

function renderMeters(stages) {
  if (!leadMetersEl) return;
  leadMetersEl.innerHTML = "";

  for (const stage of stages) {
    const meter = document.createElement("article");
    meter.className = "meter";
    meter.innerHTML = `
      <p class="meter-head">
        <span>${stage.label}</span>
        <span class="meter-value">${fmtHours(stage.hours)}</span>
      </p>
      <div class="meter-track">
        <div class="meter-fill" style="--meter-width:${clampPct(stage.hours)}%"></div>
      </div>
    `;
    leadMetersEl.appendChild(meter);
  }
}

function renderReplay(items) {
  if (!replayTimelineEl) return;
  replayTimelineEl.innerHTML = "";
  if (!items.length) {
    replayTimelineEl.innerHTML = '<li class="replay-item loading">No replay data yet.</li>';
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "replay-item";
    li.innerHTML = `
      <p class="replay-head">${item.head}</p>
      <p class="replay-title">${item.title}</p>
      <p class="replay-detail">${item.detail}</p>
    `;
    replayTimelineEl.appendChild(li);
  }
}

function renderRitualList(targetEl, issues, emptyText) {
  if (!targetEl) return;
  targetEl.innerHTML = "";
  if (!issues.length) {
    targetEl.innerHTML = `<article class="ritual-item loading">${emptyText}</article>`;
    return;
  }

  for (const issue of issues) {
    const article = document.createElement("article");
    article.className = "ritual-item";
    article.innerHTML = `
      <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer">${issue.title}</a>
      <p class="ritual-meta">Updated ${formatAgo(issue.updated_at || issue.created_at)}</p>
    `;
    targetEl.appendChild(article);
  }
}

function celebrateRelease(issue) {
  if (!issue || !celebrateLayerEl) return;
  const closedAt = toMs(issue.closed_at || issue.updated_at);
  if (!closedAt) return;
  const ageHours = (Date.now() - closedAt) / 3600000;
  if (ageHours > 24) return;

  const key = `release-celebrate-${issue.number}-${issue.closed_at || issue.updated_at}`;
  if (window.localStorage.getItem(key)) return;
  window.localStorage.setItem(key, "1");

  const colors = ["#62d4ff", "#7ce7ac", "#ffd988", "#ff8d70", "#d3f6ff"];
  const confettiCount = 72;
  for (let i = 0; i < confettiCount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = "-24px";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 320}ms`;
    piece.style.animationDuration = `${1400 + Math.random() * 900}ms`;
    celebrateLayerEl.appendChild(piece);
    window.setTimeout(() => piece.remove(), 2600);
  }

  const banner = document.createElement("aside");
  banner.className = "release-banner";
  banner.textContent = `Release shipped: ${issue.title}`;
  document.body.appendChild(banner);
  window.setTimeout(() => banner.remove(), 6500);
}

async function loadTeamRoom() {
  const repo = inferRepoFromLocation();
  const base = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  if (decisionLogLinkEl) {
    decisionLogLinkEl.href = `https://github.com/${repo.owner}/${repo.repo}/blob/main/docs/DECISION_LOG.md`;
  }

  const [
    toolIssues,
    pulls,
    poRunsData,
    seRunsData,
    qaRunsData,
    pagesRunsData,
    watchdogRunsData,
    standups,
    retros
  ] = await Promise.all([
    fetchJson(`${base}/issues?state=all&labels=type:tool&sort=updated&direction=desc&per_page=100`),
    fetchJson(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=60`),
    fetchJson(`${base}/actions/workflows/daily-product-owner.yml/runs?per_page=20`),
    fetchJson(`${base}/actions/workflows/software-engineer.yml/runs?per_page=20`),
    fetchJson(`${base}/actions/workflows/qa-review.yml/runs?per_page=20`),
    fetchJson(`${base}/actions/workflows/pages.yml/runs?per_page=20`),
    fetchJson(`${base}/actions/workflows/pipeline-watchdog.yml/runs?per_page=20`),
    fetchJson(`${base}/issues?state=all&labels=type:standup&sort=updated&direction=desc&per_page=20`),
    fetchJson(`${base}/issues?state=all&labels=type:retro&sort=updated&direction=desc&per_page=20`)
  ]);

  const issues = Array.isArray(toolIssues) ? toolIssues.filter((item) => !item.pull_request) : [];
  const openIssues = issues.filter((issue) => issue.state === "open");
  const openPrs = Array.isArray(pulls) ? pulls.filter((pr) => pr.state === "open") : [];
  const mergedPrs = Array.isArray(pulls)
    ? pulls.filter((pr) => pr.merged_at).sort((a, b) => toMs(b.merged_at) - toMs(a.merged_at))
    : [];

  let readyCount = 0;
  let inProgressCount = 0;
  let qaCount = 0;

  for (const issue of openIssues) {
    const labels = getLabels(issue);
    if (labels.includes("status:ready-for-engineering")) readyCount += 1;
    if (labels.includes("status:in-progress")) inProgressCount += 1;
    if (labels.includes("status:qa-review")) qaCount += 1;
  }

  const poRuns = poRunsData?.workflow_runs || [];
  const qaRuns = qaRunsData?.workflow_runs || [];
  const seRuns = seRunsData?.workflow_runs || [];
  const pagesRuns = pagesRunsData?.workflow_runs || [];
  const watchdogRuns = watchdogRunsData?.workflow_runs || [];
  const lastPo = poRuns[0] || null;
  const lastQa = qaRuns[0] || null;
  const lastWatchdog = watchdogRuns[0] || null;

  renderAgents({
    readyCount,
    inProgressCount,
    qaCount,
    openPrCount: openPrs.length,
    lastQaConclusion: lastQa?.conclusion || "",
    lastPoConclusion: lastPo?.conclusion || "",
    lastWatchdogConclusion: lastWatchdog?.conclusion || ""
  });

  const latestMergedPr = mergedPrs[0] || null;
  let linkedIssue = null;
  let qaComment = null;
  let evePlanComment = null;
  let ideaToPrHours = 0;
  let prToQaHours = 0;
  let qaToDeployHours = 0;

  if (latestMergedPr) {
    const issueNumber = parseIssueFromPrBody(latestMergedPr.body);
    linkedIssue = issues.find((issue) => issue.number === issueNumber) || null;

    if (linkedIssue) {
      const issueComments = await fetchJson(
        `${base}/issues/${linkedIssue.number}/comments?per_page=100`
      );
      if (Array.isArray(issueComments)) {
        evePlanComment = issueComments.find((comment) =>
          String(comment.body || "").includes("Implementation Plan")
        );
      }
      ideaToPrHours = (toMs(latestMergedPr.created_at) - toMs(linkedIssue.created_at)) / 3600000;
    }

    const prComments = await fetchJson(`${base}/issues/${latestMergedPr.number}/comments?per_page=100`);
    if (Array.isArray(prComments)) {
      qaComment = prComments.find((comment) =>
        String(comment.body || "").includes("## QA Review Report")
      );
    }

    if (qaComment) {
      prToQaHours = (toMs(qaComment.created_at) - toMs(latestMergedPr.created_at)) / 3600000;
      const firstDeployAfterQa = pagesRuns.find((run) => toMs(run.created_at) >= toMs(qaComment.created_at));
      if (firstDeployAfterQa) {
        qaToDeployHours = (toMs(firstDeployAfterQa.created_at) - toMs(qaComment.created_at)) / 3600000;
      }
    }
  }

  renderMeters([
    { label: "Idea -> PR", hours: ideaToPrHours },
    { label: "PR -> QA Verdict", hours: prToQaHours },
    { label: "QA -> Deploy", hours: qaToDeployHours }
  ]);

  const latestIssue = linkedIssue || issues[0] || null;
  const scorecard = extractSection(latestIssue?.body || "", "PO Scorecard");
  const whyNow = extractScorecardField(scorecard, "Why now") || "Why-now context not available yet.";
  const qaDecisionMatch = String(qaComment?.body || "").match(/Decision:\s*\*\*(PASS|FAIL)\*\*/i);
  const qaDecision = qaDecisionMatch?.[1] || "PENDING";

  const replayItems = [
    {
      head: `${AGENTS.ava.name} • Product Brief`,
      title: latestIssue ? latestIssue.title : "Waiting for first tool brief",
      detail: whyNow
    },
    {
      head: `${AGENTS.eve.name} • Engineering Plan`,
      title: evePlanComment ? "Implementation plan published" : "Plan comment pending",
      detail: evePlanComment
        ? `Posted ${formatAgo(evePlanComment.created_at)} on issue #${latestIssue?.number || ""}.`
        : "SE plan appears when a ready issue is picked."
    },
    {
      head: `${AGENTS.eve.name} • Pull Request`,
      title: latestMergedPr
        ? `${latestMergedPr.title} (merged ${formatAgo(latestMergedPr.merged_at)})`
        : "No merged PR yet",
      detail: latestMergedPr
        ? `PR #${latestMergedPr.number} closed the tool handoff loop.`
        : "PR replay will appear after the next implementation."
    },
    {
      head: `${AGENTS.nora.name} • QA Verdict`,
      title: `Decision: ${qaDecision}`,
      detail: qaComment
        ? `QA report posted ${formatAgo(qaComment.created_at)} with structured risk assessment.`
        : "QA report pending."
    }
  ];

  renderReplay(replayItems);
  renderRitualList(
    standupListEl,
    Array.isArray(standups) ? standups.slice(0, 6) : [],
    "No standup issues yet."
  );
  renderRitualList(
    retroListEl,
    Array.isArray(retros) ? retros.slice(0, 6) : [],
    "No retro issues yet."
  );

  const doneIssues = issues
    .filter((issue) => issue.state === "closed" || getLabels(issue).includes("status:done"))
    .sort((a, b) => toMs(b.closed_at || b.updated_at) - toMs(a.closed_at || a.updated_at));
  celebrateRelease(doneIssues[0]);

  if (roomTimestampEl) {
    roomTimestampEl.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  }

  const lastSe = seRuns[0];
  if (lastSe && roomTimestampEl) {
    roomTimestampEl.title = `Latest SE run: ${lastSe.conclusion || lastSe.status}`;
  }
}

async function boot() {
  try {
    await loadTeamRoom();
  } catch {
    if (roomTimestampEl) {
      roomTimestampEl.textContent = "Sync failed. Retrying...";
    }
  }
}

boot();
window.setInterval(boot, 120000);
