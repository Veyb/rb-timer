## 1. Backend config

- [x] 1.1 Rewrite `apps/backend/config/database.ts` to read `env('DATABASE_CLIENT', 'sqlite')` and branch the returned `connection` per client (`sqlite`, `postgres`), per design.md's config shape and env var names. Verify: `apps/backend/config/database.ts` no longer contains a hardcoded `client: 'sqlite'` literal.
- [x] 1.2 Add the commented `DATABASE_CLIENT`/`DATABASE_*` section to `apps/backend/.env.example`, noting sqlite is the effective default and Postgres requires installing `pg` first. Verify: reading the file top to bottom, a new contributor can tell what's needed to switch clients without checking other docs.

## 2. Verification

- [x] 2.1 Run `pnpm --filter backend dev` with no `DATABASE_CLIENT` set and confirm Strapi boots against `.tmp/data.db` exactly as before (admin panel loads, existing content-types list data) — confirms the default path is unchanged.
- [x] 2.2 Run `pnpm --filter backend check-types` and `pnpm --filter backend check` (biome) and confirm both pass against the rewritten `database.ts`.
- [x] 2.3 Temporarily set `DATABASE_CLIENT=postgres` (with no `pg` installed) and confirm Strapi fails fast at boot with a clear "cannot find module 'pg'"-style error rather than silently falling back to sqlite or crashing unclearly — confirms the accepted risk in design.md behaves as documented. Unset it again afterward.
