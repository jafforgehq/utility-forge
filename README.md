# Utility Forge

[![CI](https://github.com/jafforgehq/utility-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/jafforgehq/utility-forge/actions/workflows/pages.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/pages.yml)
[![Daily Product Owner Idea](https://github.com/jafforgehq/utility-forge/actions/workflows/daily-product-owner.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/daily-product-owner.yml)
[![QA Review Automation](https://github.com/jafforgehq/utility-forge/actions/workflows/qa-review.yml/badge.svg)](https://github.com/jafforgehq/utility-forge/actions/workflows/qa-review.yml)

Utility Forge is a self-evolving developer utilities website.

Version 1 starts with one production-ready tool:
- `JSON Formatter / Minifier / Key Sorter`

> Disclaimer: Utility Forge is an autonomous alpha showcase. Pipelines are production-like, but tool depth and coverage are still expanding.

The long-term model is a daily tool release managed by 3 roles:
1. `Product Owner`: creates one new tool idea every day.
2. `Software Engineer`: implements the idea in a pull request.
3. `QA`: verifies behavior, tests, and release quality before merge.

## Live Site

This repo is configured for automatic deployment to GitHub Pages from `main` using `.github/workflows/pages.yml`.
- Public URL: `https://jafforgehq.github.io/utility-forge/`
- Agile Team Control Room: `https://jafforgehq.github.io/utility-forge/team.html`

## Results Snapshot

- Live results are published on the homepage in **Results Snapshot**:
  - Tools shipped
  - QA pass rate (recent completed runs)
  - Average lead time (idea -> deploy, recent merged items)
  - Last successful deploy timestamp

## Local Development

```bash
npm install
npm test
python3 -m http.server 8080 --directory site
```

Then open: `http://localhost:8080`

## Daily Product Owner Automation

Workflow: `.github/workflows/daily-product-owner.yml`

What it does:
- Runs every day.
- Uses OpenAI API to generate three candidate ideas and selects one with fixed internal scoring.
- Creates a GitHub issue titled with the tool name and launch date (signed by **Ava PO**).
- Adds PO scorecard context (`Value`, `Effort`, `Confidence`, `Why now`).
- Adds selection notes so the chosen idea is transparent.
- Starts a standup-style issue comment thread (`Yesterday`, `Today`, `Blockers`).
- Enforces guardrails:
  - Max one daily issue per date tag
  - Duplicate tool-name detection with one regeneration attempt
  - Daily model-call limit (`OPENAI_DAILY_CALL_LIMIT`)

Required repo settings:
1. Add secret: `OPENAI_API_KEY`
2. Add optional variable or secret: `OPENAI_MODEL`
3. Add optional variable or secret: `OPENAI_DAILY_CALL_LIMIT` (default: `1`)
4. Add optional variable or secret: `TOOL_LAUNCH_OFFSET_DAYS` (default: `1`)
5. If `OPENAI_MODEL` is not set, workflow defaults to `gpt-4o-mini` (low-cost baseline model)

Troubleshooting:
- If Product Owner falls back unexpectedly, open the workflow run logs and search for `PO idea generation mode:` and `OpenAI generation failed:`.
- If your configured `OPENAI_MODEL` returns a model-related `400`, the workflow auto-retries with `gpt-4o-mini`.
- If you see `OPENAI_DAILY_CALL_LIMIT reached`, increase repo variable `OPENAI_DAILY_CALL_LIMIT`.

## Software Engineer Automation

Workflow: `.github/workflows/software-engineer.yml`

What it does:
- Triggers when an issue gets `status:ready-for-engineering`.
- Posts an implementation-plan comment from **Eve SE** before coding.
- Creates a `codex/...` branch, generates a tool implementation, runs tests, and opens a PR.
- Appends a human-readable entry to the product `docs/DECISION_LOG.md`.
- Dispatches QA handoff event after PR creation.

## QA Automation

Workflow: `.github/workflows/qa-review.yml`

What it does:
- Triggered by Software Engineer handoff dispatch.
- Waits 15 minutes before running QA checks (hard delay gate).
- Runs tests plus acceptance-criteria matching, posts a structured QA report from **Nora QA** (`Severity`, `Risk`, `Recommendation`), auto-merges passing PRs, and closes linked issues.
- Auto-retries QA once when tests/criteria pass but merge/deploy fails for operational reasons.

## Team Ritual Workflows

- Daily Standup (`.github/workflows/daily-standup.yml`): opens a standup issue with role updates from Ava PO, Eve SE, and Nora QA, and auto-closes the previous open standup thread.
- Weekly Retro (`.github/workflows/weekly-retro.yml`): opens a Friday retro issue with wins/failures/action items and team reflections, and auto-closes older open retro threads.
- Pipeline Watchdog (`.github/workflows/pipeline-watchdog.yml`): runs hourly to retrigger stuck `ready`, `in-progress`, and `qa-review` items.

## Role Operating Model

See detailed flow in [`docs/OPERATING_MODEL.md`](docs/OPERATING_MODEL.md).

## Decision Trail

- Product rationale log: [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md)

## Initial Backlog Direction

The Product Owner idea generator uses:
- `data/idea-seeds.md` (seed themes)
- Existing repo context to avoid duplicate ideas

This keeps idea generation consistent while still producing one new concept daily.

## Generated Tools

- [Base64 / URL-safe Converter](site/tools/base64-url-safe-converter-1/) - Convert UTF-8 text between Base64 and URL-safe Base64 formats.
- [Cron expression explainer](site/tools/cron-expression-explainer-18/) - Normalize and sort lines of text for quick developer cleanup tasks.
- [SQL formatter and pretty printer](site/tools/sql-formatter-and-pretty-printer-15/) - Normalize and sort lines of text for quick developer cleanup tasks.
- [JWT payload decoder and expiry checker](site/tools/jwt-payload-decoder-and-expiry-checker-5/) - Decode JWT payloads instantly and check expiry status for quick auth debugging.
- [Convert curl command -> fetch snippet generator](site/tools/convert-curl-command-fetch-snippet-gener-3/) - Convert common curl commands into JavaScript fetch snippets for quick API testing and docs.
- [HTTP status code lookup assistant](site/tools/http-status-code-lookup-assistant-6/) - Look up HTTP status meanings quickly, including single-code and batch lookup modes.
- [Markdown table builder from CSV](site/tools/markdown-table-builder-from-csv-12/) - Convert CSV or TSV rows into clean Markdown tables for docs and pull requests.
