## Context

See `proposal.md` for motivation. Current state, confirmed during exploration (not assumed):

- `.vscode/launch.json` already has a `"type": "chrome", "request": "launch"` config pointed at `http://localhost:3000`, with no `userDataDir` set. Per `vscode-js-debug`'s own docs, that means Chrome launches with an isolated temp profile (never the user's personal daily Chrome profile) — confirmed by the user that this profile persists across relaunches, so a one-time login to the app survives future debug sessions.
- Also per `vscode-js-debug`'s docs, the `port` attribute for this config defaults to `"0"`, which debugs over pipes rather than a TCP port — "generally more secure, and should be chosen unless you need to attach to the browser from another tool." We do need that: an external MCP server process attaching to the same Chrome instance.
- Playwright MCP (`@playwright/mcp`, Microsoft's official package) supports three connection modes: default launch (its own persistent profile), `--cdp-endpoint <url>` (attach to an already-running Chromium via CDP), and `--extension` (attach to a tab in the user's regular browser via a dedicated Playwright browser extension). Playwright MCP's own docs state plainly it "is **not** a security boundary" and that exposing a CDP port allows full remote control of that browser instance.
- No `.mcp.json` or `.cursor/mcp.json` exists in this repo today; no MCP servers are configured globally either (checked `~/.claude.json`).

## Goals / Non-Goals

**Goals:**
- Let an AI agent (Claude Code or Cursor, from one shared, git-committed config) drive a real, already-authenticated instance of this app's frontend during a dev session.
- Reuse the isolated + persistent Chrome the user already has working via `launch.json`, rather than introducing a second, different browser-automation mechanism.

**Non-Goals:**
- Unattended/CI test automation (a full Playwright Test suite) — see proposal.md's explicit scope cut.
- Editor-native alternatives (Anthropic's "Claude in Chrome" extension, Cursor's built-in "Cursor Browser") — both exist and work without any repo change, but each is single-editor-specific and neither was chosen, in favor of one config that works identically from either tool.
- Exposing the CDP port beyond `localhost`, or using this setup against anything other than the local dev server.

## Decisions

**CDP-endpoint mode over default-launch or `--extension` mode.**
- Default-launch mode (Playwright MCP spawns its own persistent-profile browser) would work standalone, but would mean a *third* separate browser/profile in play (VS Code's `launch.json` Chrome, Playwright MCP's own Chrome, and the user's daily Chrome) — one more login to maintain, and it wouldn't let the user visually watch the same window the agent drives.
- `--extension` mode is the closest vendor-neutral equivalent to "Claude in Chrome," attaching to a tab in the user's regular daily browser — but that means the agent would be operating in the browser window that also holds the user's personal logins (email, banking, etc.), which is exactly the isolation the user wants to avoid per their own stated security concern.
- `--cdp-endpoint` lets Playwright MCP attach to the *specific* Chrome instance already launched by `.vscode/launch.json` — isolated from the user's personal profile, already authenticated to the app, and visible in a real window the user can watch alongside the agent. This is the only one of the three that satisfies both "shared across editors" and "isolated from personal browsing" at once.

**`"port": 9222`.**
9222 is Chrome's own long-standing conventional default remote-debugging port (used in most tooling examples); confirmed free on this machine (`lsof -i :9222` returned nothing). Using the conventional port rather than an arbitrary one keeps the config recognizable to anyone who has used Chrome remote debugging before.

**Two separate MCP config files (`.mcp.json` and `.cursor/mcp.json`) with identical content, not a symlink or shared include.**
Claude Code and Cursor each read their own config path and neither natively supports pointing at the other's file or a shared external one. Duplicating the ~6-line JSON block is simpler and more transparent than introducing a build step or symlink to keep them in sync, and matches this repo's existing pattern of mirroring OpenSpec tooling into both `.claude`-style and `.cursor/commands` + `.cursor/skills` directories.

**No new `package.json` dependency.**
`npx @playwright/mcp@latest` downloads and caches the package on first use per the standard MCP-server convention; adding it as a `frontend/package.json` devDependency would be unusual (it's not part of the app's build or test pipeline, it's editor tooling) and would tie its version to whatever the frontend's own dependency-update cadence is, rather than always getting the latest MCP server release.

## Risks / Trade-offs

- [Risk] An open CDP port is explicitly "not a security boundary" — any local process that can reach `localhost:9222` gets full control of that Chrome instance (navigate, read page content, execute JS). → **Mitigation**: the port only binds to `localhost` by default (not `0.0.0.0`); never change that binding. Treat the debug-profile Chrome window as a dev tool, not a general-purpose browser — don't browse unrelated/untrusted sites in it while the port is open.
- [Risk] The MCP server (`--cdp-endpoint http://localhost:9222`) will fail to connect if the user hasn't launched Chrome via the VS Code debug config first — the agent can't launch it on its own since that's a VS Code debug-adapter action, not something `npx @playwright/mcp` triggers itself. → **Mitigation**: document this ordering requirement clearly (start the "Launch Chrome against localhost" debug config before asking the agent to use the browser); the MCP server's own connection-failure error should make the missing step obvious.
- [Risk] Playwright MCP's own browser (via `npx`) may download a Chromium/Playwright browser package on first run even in `--cdp-endpoint` mode, since the npm package itself may still need its own browser binaries for other internal operations. → **Mitigation**: verify this during implementation (task list); if a download happens, it's one-time and cached, not a recurring cost.

## Migration Plan

1. Add `"port": 9222` to the existing chrome launch config in `.vscode/launch.json`.
2. Create `.mcp.json` at the repo root and `.cursor/mcp.json`, each registering the `playwright` MCP server with `--cdp-endpoint http://localhost:9222` (verified empirically: Chrome's actual `webSocketDebuggerUrl` includes a per-launch random UUID, so a bare `ws://localhost:9222` 404s — the `http://` form is required so Playwright auto-discovers the current UUID via `/json/version` on each connect).
3. Verify: launch Chrome via the VS Code debug config, then confirm an MCP client can connect and successfully drive that browser (navigate, read page content) against `http://localhost:3000`.
4. Rollback: revert the three files (or delete the two new ones and revert the `launch.json` line) — no other system state is touched, no dependencies installed into `package.json`.
