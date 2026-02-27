# Operating Model: Product Owner -> Software Engineer -> QA

## Mission

Ship one new developer utility every day with quality gates.

## Roles

## Product Owner
- Generates one tool idea per day.
- Creates issue with value statement, scope, and acceptance criteria.
- Labels issue for engineering handoff.

## Software Engineer
- Claims a ready idea.
- Implements the tool in code and tests.
- Opens pull request and links implementation issue.

## QA
- Reviews behavior against acceptance criteria.
- Adds or requests tests for edge cases and regressions.
- Approves merge only when quality checks pass.

## Labels

- `role:product-owner`
- `role:software-engineer`
- `role:qa`
- `status:ready-for-engineering`
- `status:in-progress`
- `status:qa-review`
- `status:done`
- `type:tool`

## Daily Flow

1. Product Owner workflow creates one idea issue daily.
2. Software Engineer moves issue to implementation and opens PR.
3. QA starts automatically after a 15-minute delay and verifies:
   - Functional behavior
   - Error handling
   - Test coverage for core logic
4. Merge to `main` triggers GitHub Pages deployment.

## Automation Workflows

- `.github/workflows/daily-product-owner.yml`
- `.github/workflows/software-engineer.yml`
- `.github/workflows/qa-review.yml`

## Definition Of Done (Per Tool)

- Tool works in desktop and mobile.
- Core logic has automated tests.
- Empty/error states are handled.
- README updated with new tool entry.
