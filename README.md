# Utility Forge

[![CI](https://github.com/jafforgehq/utility-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/jafforgehq/utility-forge/actions/workflows/pages.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/pages.yml)
[![Daily Product Owner Idea](https://github.com/jafforgehq/utility-forge/actions/workflows/daily-product-owner.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/daily-product-owner.yml)
[![QA Review Automation](https://github.com/jafforgehq/utility-forge/actions/workflows/qa-review.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/qa-review.yml)

Utility Forge is an autonomous developer-tools project that ships to GitHub Pages using a 3-role workflow:
- `Ava PO` (Product Owner): creates one tool idea/day
- `Eve SE` (Software Engineer): implements and opens PR
- `Nora QA` (QA): verifies, reports, and auto-merges on pass

## Live

- Website: `https://jafforgehq.github.io/utility-forge/`
- Team control room: `https://jafforgehq.github.io/utility-forge/team.html`

The homepage includes:
- Pipeline stages and queue state
- Health snapshot
- Results snapshot (tools shipped, QA pass rate, lead time, last deploy)
- Recent activity flow
- Live + planned tool catalog

## How It Works

- **Daily Product Owner** (`.github/workflows/daily-product-owner.yml`)
  - Runs on schedule.
  - Generates 3 AI candidates, scores them, and creates one issue.
  - Applies guardrails: max 1 idea/day, duplicate detection, daily model-call cap.
  - If AI fails, falls back to deterministic seed ideas.

- **Software Engineer** (`.github/workflows/software-engineer.yml`)
  - Picks `status:ready-for-engineering` issue.
  - Posts implementation plan.
  - Generates tool files, runs tests, opens PR, and dispatches QA handoff.

- **QA** (`.github/workflows/qa-review.yml`)
  - Waits 15 minutes, runs tests + acceptance checks.
  - Posts structured QA report.
  - Auto-merges passing PRs and triggers deploy.
  - Retries transient API failures with backoff.

- **Deploy** (`.github/workflows/pages.yml`)
  - Publishes `site/` to GitHub Pages from `main`.

- **Support workflows**
  - `.github/workflows/daily-standup.yml` (daily standup thread)
  - `.github/workflows/weekly-retro.yml` (weekly retro thread)
  - `.github/workflows/pipeline-watchdog.yml` (re-triggers stuck items)

## Required Repository Settings

- Secret: `OPENAI_API_KEY`
- Optional variable/secret: `OPENAI_MODEL`
- Optional variable/secret: `OPENAI_DAILY_CALL_LIMIT` (default `1`)
- Optional variable/secret: `TOOL_LAUNCH_OFFSET_DAYS` (default `1`)

Notes:
- Default model fallback is `gpt-4o-mini`.
- If configured model returns a model-related `400`, PO workflow retries with `gpt-4o-mini`.

## Troubleshooting

- Check PO logs for:
  - `PO idea generation mode:`
  - `OpenAI generation failed:`
- If you see `OPENAI_DAILY_CALL_LIMIT reached`, increase `OPENAI_DAILY_CALL_LIMIT`.
- If PO falls back, verify model name and API project model access.

## Local Development

```bash
npm install
npm test
python3 -m http.server 8080 --directory site
```

Open `http://localhost:8080`.

## Source Of Truth For Tools

- Generated live tools registry: [`site/generated-tools.json`](site/generated-tools.json)
- Product decision trail: [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md)
- Operating model: [`docs/OPERATING_MODEL.md`](docs/OPERATING_MODEL.md)
- Seed backlog: [`data/idea-seeds.md`](data/idea-seeds.md)

## Alpha Limitations

- External API/provider failures can still force deterministic fallback.
- Tool quality and scope vary by day and are still improving.

## Generated Tools

- [**UUID CLI Toolkit**](site/tools/uuid-cli-toolkit-36/) - Normalize and sort lines of text for quick developer cleanup tasks.
