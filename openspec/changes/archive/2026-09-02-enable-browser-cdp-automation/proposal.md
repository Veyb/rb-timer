## Why

Neither Claude Code nor Cursor can currently drive a real, authenticated browser against this app. During the `modernize-frontend-tsconfig` change, task 6.3 ("manually smoke-test the boss list, collections, donations, and user management screens") could only be verified at the HTTP-response level — no browser-automation tool was available, so the actual click-through of auth-gated screens had to be done by the user by hand. This change closes that gap with a small, editor-agnostic wiring: a VS Code-launched, isolated, persistent Chrome instance that an MCP-driven AI agent (Claude Code or Cursor, either one, from the same config) can attach to and drive.

## What Changes

- `.vscode/launch.json`: add `"port": 9222` to the existing "Launch Chrome against localhost" configuration, switching it from VS Code's default pipe-based debugging to a TCP-based Chrome DevTools Protocol (CDP) endpoint that an external process can also connect to. Confirmed (by the user, empirically) that this launch config already uses an isolated temp profile — never the user's personal daily Chrome profile — and that the profile persists login state across relaunches.
- `.mcp.json` (repo root, for Claude Code) and `.cursor/mcp.json` (for Cursor): both register a `playwright` MCP server using `npx @playwright/mcp@latest --cdp-endpoint http://localhost:9222`, so either editor's agent attaches to the same already-running, already-authenticated Chrome window rather than spawning its own isolated browser.
- No changes to `frontend/` or `backend/` application code — this is dev-tooling/environment configuration only.

**Explicitly out of scope for this change** (raised during exploration, deliberately deferred): a full Playwright Test suite (`*.spec.ts` files, `playwright.config.ts`, headless CI runs) for unattended regression testing. That is a materially larger effort — actual test scenarios, a test runner config, possibly a CI workflow — and serves a different purpose (automated regression detection without a human or an AI agent in the loop) than this change's goal (letting an AI agent interactively drive a real authenticated browser during a coding session, the way task 6.3 needed). It can be proposed as a separate change later.

## Capabilities

No product-facing capability or requirement changes — this is dev-tooling/environment configuration only. `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `.vscode/launch.json` — one line added (`"port": 9222`).
- `.mcp.json` (new file, repo root) and `.cursor/mcp.json` (new file) — both git-committed so any future Claude Code or Cursor session on this project gets the same setup automatically, without per-person manual configuration.
- Security note carried into design.md: a CDP port is explicitly documented by Playwright MCP as "not a security boundary" — any local process that can reach `localhost:9222` gets full control of that Chrome instance. Acceptable for a local dev-only port bound to `localhost`, not something to ever expose beyond this machine.
- No change to `backend/`, no change to production build/runtime behavior, no new frontend/backend dependencies (Playwright MCP is invoked via `npx`, not added to `package.json`).
