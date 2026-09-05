# rb-timer

Timer for tracking the respawn of raid bosses

## Development

Requires Node.js 22 (see `.nvmrc`) and [pnpm](https://pnpm.io) (`corepack enable pnpm`).

`apps/frontend/` and `apps/backend/` live under one root pnpm workspace
(`pnpm-workspace.yaml`) — a single `pnpm install` from the repo root installs
both. An earlier attempt at a shared workspace was reverted (see
`docs/MIGRATION.md`, Stage 4) after backend-only React/styled-components
instances leaked into frontend's typecheck; the `adopt-pnpm-monorepo` OpenSpec
change re-tested that exact failure mode against the current toolchain before
re-adopting this layout — see that change's `design.md` for the evidence.
`dev` still runs as two separate long-running processes, one per app:

```bash
pnpm install                  # once, from the repo root

pnpm --filter backend dev     # Strapi admin/API on :1337
pnpm --filter frontend dev    # Next.js app on :3000
```

Both apps default to `localhost` out of the box (`apps/frontend/.env.development`,
`apps/backend/config/server.js`'s `PUBLIC_URL` default, `apps/backend/config/middlewares.js`'s
`CORS_ORIGINS` default) — nothing to configure for local development.

### AI-driven browser automation

Claude Code and Cursor can drive a real, already-authenticated browser against
the running frontend, via the Playwright MCP server (`.mcp.json` / `.cursor/mcp.json`)
attaching over the Chrome DevTools Protocol to the Chrome instance started by the
"Launch Chrome against localhost" VS Code debug config.

**Order of operations matters**: launch that debug config (F5, or the Run and
Debug panel) *before* asking the agent to use its browser tools. The MCP server
only attaches to an already-running Chrome on `localhost:9222` — it does not (and
cannot) launch one itself. This debug-launched Chrome uses an isolated profile,
separate from your regular daily browser, but the profile persists across
relaunches, so logging into the app once is enough for future sessions.

## Production build

There is currently no fixed production domain — `apps/frontend/.env.production` and
`apps/backend`'s CORS/URL defaults all point at `localhost` as a safe fallback, so a
plain build still works but isn't meant to be deployed as-is. When a real domain
exists, override these **without editing the committed files**, either via a
git-ignored `.env.production.local` (`apps/frontend/`) / `.env` (`apps/backend/`), or by passing
real environment variables directly to the commands below.

**Frontend** — `API_URL`/`SOCKET_URL`/`IMAGE_URL`/`IMAGE_DOMAIN` are inlined into
the build output by `next.config.js`'s `env` key, so they must be set *before*
the build below runs (changing them afterwards requires a rebuild):

```bash
API_URL=https://<domain>/api \
SOCKET_URL=https://<domain> \
IMAGE_URL=https://<domain> \
IMAGE_DOMAIN=<domain> \
pnpm --filter frontend build
```

**Backend** — set in `apps/backend/.env` (see `apps/backend/.env.example`):

```bash
PUBLIC_URL=https://<api-domain>
CORS_ORIGINS=https://<domain>,https://www.<domain>
APP_KEYS=<comma-separated random values>
ADMIN_JWT_SECRET=<random value>
JWT_SECRET=<random value>
API_TOKEN_SALT=<random value>
TRANSFER_TOKEN_SALT=<random value>
```

`CORS_ORIGINS` is shared by both the REST API's CORS middleware and the
socket.io server (`apps/backend/src/index.js`) — one variable, one list of allowed origins.
