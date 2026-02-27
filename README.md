# Utility Forge

Utility Forge is a self-evolving developer utilities website.

Version 1 starts with one production-ready tool:
- `JSON Formatter / Minifier / Key Sorter`

The long-term model is a daily tool release managed by 3 roles:
1. `Product Owner`: creates one new tool idea every day.
2. `Software Engineer`: implements the idea in a pull request.
3. `QA`: verifies behavior, tests, and release quality before merge.

## Live Site

This repo is configured for automatic deployment to GitHub Pages from `main` using `.github/workflows/pages.yml`.

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
- Uses OpenAI API to generate one fresh tool idea.
- Creates a GitHub issue labeled for handoff to engineering.
- Enforces guardrails:
  - Max one daily issue per date tag
  - Duplicate tool-name detection with one regeneration attempt
  - Daily model-call limit (`OPENAI_DAILY_CALL_LIMIT`)

Required repo settings:
1. Add secret: `OPENAI_API_KEY`
2. Add optional variable or secret: `OPENAI_MODEL`
3. Add optional variable or secret: `OPENAI_DAILY_CALL_LIMIT` (default: `1`)
4. If `OPENAI_MODEL` is not set, workflow defaults to `gpt-4o-mini` (low-cost baseline model)

## Software Engineer Automation

Workflow: `.github/workflows/software-engineer.yml`

What it does:
- Triggers when an issue gets `status:ready-for-engineering`.
- Creates a `codex/...` branch, generates a tool implementation, runs tests, and opens a PR.
- Dispatches QA handoff event after PR creation.

## QA Automation

Workflow: `.github/workflows/qa-review.yml`

What it does:
- Triggered by Software Engineer handoff dispatch.
- Waits 15 minutes before running QA checks (hard delay gate).
- Runs tests plus acceptance-criteria matching, posts a QA report, auto-merges passing PRs, and closes linked issues.

## Role Operating Model

See detailed flow in [`docs/OPERATING_MODEL.md`](docs/OPERATING_MODEL.md).

## Initial Backlog Direction

The Product Owner idea generator uses:
- `data/idea-seeds.md` (seed themes)
- Existing repo context to avoid duplicate ideas

This keeps idea generation consistent while still producing one new concept daily.
