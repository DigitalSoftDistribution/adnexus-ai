---
name: repo
type: repo
agent: CodeActAgent
---

# Repository Guide (Softblaze / Digital Soft Distribution)

This repo is part of the Softblaze org. Before doing substantial work, **read the repo's own `CLAUDE.md`, `README.md`, and any `.cursor/rules/` or `.claude/rules/` files** — they hold the authoritative stack, conventions, and commands. This guide only covers universals.

## Setup
`.openhands/setup.sh` runs on checkout and auto-installs dependencies (pnpm/npm/yarn/bun for Node, composer for PHP, uv/pip for Python). If it didn't run or deps are missing, install them yourself based on the lockfile present.

## Verify before finishing (mandatory)
Run whatever the repo provides and fix all errors before completing:
- **Node**: `pnpm type-check` (or `typecheck`), `pnpm lint`, `pnpm build` when relevant. (Use the package manager matching the lockfile — pnpm is the org default.)
- **PHP**: `composer lint` / `phpstan` / `phpunit` if defined.
- **Python**: `ruff check`, `mypy`, `pytest` if configured.

## Git & workflow (always)
- **Never commit to `main`.** Always branch (`feat/ fix/ refactor/ docs/ chore/`). Conventional commits. Keep PRs focused.
- Validate at boundaries; no `any`/`@ts-ignore` or equivalents without a commented reason.
- Add user-facing strings to **all** locale files if the project uses i18n.
- Production-ready output: handle error/loading/empty states; no TODO/stub placeholders.

## Infra context
Apps deploy via Coolify to `https://<app>.apps.softblaze.net` on push. Secrets live in the platform, never in the repo.
