## Why

`apps/backend/config/database.ts` hardcodes `client: 'sqlite'` — the connection object isn't even read from `env('DATABASE_CLIENT', ...)`. Switching the backend to another database Strapi supports (PostgreSQL, MySQL, MariaDB) currently requires editing this file, not just setting environment variables. Stage 10 of `docs/MIGRATION.md` already anticipates a production deploy where the database choice may need to change; making the client env-driven now — while sqlite stays the default and no data migration is happening — removes that code-edit step for whenever a real switch happens.

## What Changes

- `apps/backend/config/database.ts`: read `DATABASE_CLIENT` (default `sqlite`, unchanged behavior) and branch the connection config per client instead of hardcoding `sqlite`. Add a `postgres` connection block reading `DATABASE_HOST`/`PORT`/`NAME`/`USERNAME`/`PASSWORD`/`SSL`/pool settings from env, matching Strapi's own documented config shape.
- `apps/backend/.env.example`: document the new `DATABASE_CLIENT`/`DATABASE_*` variables (commented out, sqlite remains the effective default when unset).
- **Not** in scope: adding the `pg` driver dependency, adding a MySQL/MariaDB block, actually moving any environment to Postgres, or any Docker/CI work — all deferred to a later change once a real database cutover or containerization is scheduled.

## Capabilities

No product-facing capability or requirement changes — this is a backend configuration change only, with sqlite remaining the default and no observable behavior change for any environment that doesn't set `DATABASE_CLIENT`. Mirrors the precedent set by the archived `adopt-typescript-backend` and `adopt-pnpm-monorepo` changes. `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `apps/backend/config/database.ts`: rewritten to branch on `env('DATABASE_CLIENT', 'sqlite')`.
- `apps/backend/.env.example`: new commented `DATABASE_*` section.
- No dependency changes (`pg` is not added in this change — selecting `DATABASE_CLIENT=postgres` before it's installed fails fast with a clear "module not found" error, which is acceptable since this change only makes the client switchable, not functional on Postgres yet).
- No change to `apps/backend/.env`, `better-sqlite3`, or any other app.
