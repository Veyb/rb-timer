# rb-timer

Timer for tracking the respawn of raid bosses

## Development

Requires Node.js 22 (see `.nvmrc`) and [pnpm](https://pnpm.io) (`corepack enable pnpm`).

`backend/` and `frontend/` are independent pnpm projects (own `node_modules`, own
`pnpm-lock.yaml`) — not a pnpm workspace. They share no code, and keeping them
separate avoids one app's dependencies (e.g. the Strapi admin panel's own React 18)
leaking into the other's type-checking. Install and run each from its own directory:

Run each in its own terminal — this is all it takes to get the full stack up on
localhost, no extra setup:

```bash
cd backend && pnpm install && pnpm run dev    # Strapi admin/API on :1337
cd frontend && pnpm install && pnpm run dev   # Next.js app on :3000
```

Both apps default to `localhost` out of the box (`frontend/.env.development`,
`backend/config/server.js`'s `PUBLIC_URL` default, `backend/config/middlewares.js`'s
`CORS_ORIGINS` default) — nothing to configure for local development.

## Production build

There is currently no fixed production domain — `frontend/.env.production` and
`backend`'s CORS/URL defaults all point at `localhost` as a safe fallback, so a
plain build still works but isn't meant to be deployed as-is. When a real domain
exists, override these **without editing the committed files**, either via a
git-ignored `.env.production.local` (frontend) / `.env` (backend), or by passing
real environment variables directly to the commands below.

**Frontend** — `API_URL`/`SOCKET_URL`/`IMAGE_URL`/`IMAGE_DOMAIN` are inlined into
the build output by `next.config.js`'s `env` key, so they must be set *before*
`pnpm run build` runs (changing them afterwards requires a rebuild):

```bash
API_URL=https://<domain>/api \
SOCKET_URL=https://<domain> \
IMAGE_URL=https://<domain> \
IMAGE_DOMAIN=<domain> \
pnpm run build
```

**Backend** — set in `backend/.env` (see `backend/.env.example`):

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
socket.io server (`src/index.js`) — one variable, one list of allowed origins.
