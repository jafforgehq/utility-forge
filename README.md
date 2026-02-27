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

Required repo settings:
1. Add secret: `OPENAI_API_KEY`
2. Add optional repository variable: `OPENAI_MODEL`
3. If `OPENAI_MODEL` is not set, workflow defaults to `gpt-4o-mini` (low-cost baseline model)

## Role Operating Model

See detailed flow in [`docs/OPERATING_MODEL.md`](docs/OPERATING_MODEL.md).

## Initial Backlog Direction

The Product Owner idea generator uses:
- `data/idea-seeds.md` (seed themes)
- Existing repo context to avoid duplicate ideas

This keeps idea generation consistent while still producing one new concept daily.

