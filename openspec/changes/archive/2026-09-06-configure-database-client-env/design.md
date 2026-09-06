## Context

`apps/backend/config/database.ts` currently returns a single hardcoded `{ client: 'sqlite', connection: { filename: ... }, useNullAsDefault: true }` object — see proposal.md for why this needs to change. Strapi 5 supports `sqlite`, `postgres`, `mysql` as `client` values (Knex-backed); each takes a different `connection` shape. No `DATABASE_*` env vars exist anywhere in the repo today (`.env`, `.env.example` are both empty of them), and no `pg`/`mysql` driver is installed.

## Goals / Non-Goals

**Goals:**
- Make `client` and its connection params fully env-driven, with `sqlite` as the default so every existing environment (local dev, the not-yet-executed Stage 10 runbook) keeps working unchanged when `DATABASE_CLIENT` is unset.
- Add a `postgres` block now, since that's Strapi's own recommended production database (per the earlier conversation) and the most likely target of a future cutover.

**Non-Goals:**
- Not adding the `pg` driver dependency, a `mysql`/`mariadb` block, or actually switching any environment's database — this change only makes the client swappable via env, it doesn't perform or enable a real cutover yet.
- Not touching Docker or CI/CD — explicitly deferred by the user to a later change.
- Not migrating any existing data (`.tmp/data.db` is untouched).

## Decisions

- **Config shape**: a plain object keyed by client name (`{ sqlite: {...}, postgres: {...} }[client]`) spread into the returned `connection`, rather than a `switch`/`if` chain — matches Strapi's own documented multi-database config examples and keeps each client's block self-contained.
- **Env var names**: `DATABASE_CLIENT`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX` — these are Strapi's own conventional names from its documented database config examples, not invented here, so any future Strapi upgrade guide or community example lines up directly.
- **`pg` dependency deferred**: adding an unused driver dependency now (before any environment actually runs Postgres) would sit in `package.json` untested against this codebase. Deferring it to the change that actually performs a cutover (or sets up a Docker Compose Postgres profile) keeps this change's diff minimal and keeps "add a dependency" paired with "actually use it."
- **No MySQL/MariaDB block**: the earlier database-choice discussion concluded Postgres is the concrete candidate (Strapi's own top production recommendation); adding speculative MySQL config with no intended target is scope creep this change doesn't need.

## Risks / Trade-offs

- **[Risk]** Setting `DATABASE_CLIENT=postgres` before `pg` is installed fails at boot with a "cannot find module 'pg'" error. → **Mitigation**: acceptable and expected — documented in `.env.example`; this change only makes the client selectable, not functional, for anything other than `sqlite`.
- **[Risk]** `.env.example` documenting Postgres vars might imply Postgres is already supported/tested in this codebase. → **Mitigation**: comment block explicitly states sqlite is the effective default and Postgres requires installing `pg` first.

## Migration Plan

No migration — this change is additive/backward-compatible. Any environment without `DATABASE_CLIENT` set continues to boot against sqlite with the exact same `connection.filename` as before. Rollback is a plain revert (no data or schema touched).
