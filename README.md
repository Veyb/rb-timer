# rb-timer

Timer for tracking the respawn of raid bosses

## Development

Requires Node.js 22 (see `.nvmrc`) and [pnpm](https://pnpm.io) (`corepack enable pnpm`).

`backend/` and `frontend/` are independent pnpm projects (own `node_modules`, own
`pnpm-lock.yaml`) — not a pnpm workspace. They share no code, and keeping them
separate avoids one app's dependencies (e.g. the Strapi admin panel's own React 18)
leaking into the other's type-checking. Install and run each from its own directory:

```bash
cd backend && pnpm install && pnpm run dev    # Strapi admin/API on :1337
cd frontend && pnpm install && pnpm run dev   # Next.js app on :3000
```
