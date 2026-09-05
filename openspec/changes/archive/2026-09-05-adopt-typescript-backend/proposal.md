## Why

`apps/backend` is still a plain-JS Strapi 5 project (no `tsconfig.json`, `devDependencies` empty) while `apps/frontend` is fully TypeScript. Strapi 5 ships a documented, supported path for adding TypeScript to an existing project, and this backend is small enough (5 content-types, all boilerplate factory files; only `src/index.js` and the `users-permissions` extension carry real logic) that migrating in place is lower-risk than reinitializing. Doing this now, while both apps' tsconfigs are being touched, is also the right moment to stop duplicating compiler options between `apps/frontend/tsconfig.json` and the backend's new one and extract the genuinely shared baseline into a local, unpublished workspace package.

## What Changes

- Add TypeScript support to `apps/backend` following Strapi 5's official migration path: root `tsconfig.json`, `src/admin/tsconfig.json`, `@strapi/typescript-utils` pinned as an explicit `devDependency` (today it only resolves as a transitive dep in the lockfile, not hoisted into `apps/backend/node_modules/@strapi/` under pnpm's strict layout).
- Convert all of `apps/backend/src/` and `apps/backend/config/*.js` to `.ts` in one pass (not incrementally) — 15 of the ~20 files are single-line `createCoreController`/`createCoreService`/`createCoreRouter` factory calls.
- Fix the `config/database.ts` SQLite path: compiled output moves one directory deeper (`dist/config/database.js`), so the existing `path.join(__dirname, '..', ...)` needs a second `'..'` to still land on the project root.
- Create `packages/typescript-config` (`@rb-timer/typescript-config`, private, not published) with `base.json` (shared strict-by-default options), `nextjs.json` (Next.js-specific overrides, extends `base.json`), and `strapi-server.json` (Strapi/Koa-specific overrides — notably `strict: false`, matching Strapi's own upstream server preset, since the Koa `ctx` typings and plugin ecosystem aren't strict-clean).
- Point `apps/backend/tsconfig.json` at `strapi-server.json` and rewrite `apps/frontend/tsconfig.json` to extend `nextjs.json` instead of repeating the same options inline, so the shared config is real rather than coincidentally similar.

## Capabilities

No product-facing capability or requirement changes — this is a tooling/build-configuration change only (mirrors the precedent set by the archived `modernize-frontend-tsconfig` change). `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `apps/backend/**`: every file under `src/` and `config/` renamed `.js` → `.ts`; new `tsconfig.json`, `src/admin/tsconfig.json`; `package.json` gains `@strapi/typescript-utils` (pinned to the installed `@strapi/strapi` version) and a `typescript`/`@types/node` devDependency set.
- `apps/frontend/tsconfig.json`: rewritten to extend the shared preset; no intended behavior change to the existing strict options it already carries.
- New `packages/typescript-config/` workspace package (`package.json`, `base.json`, `nextjs.json`, `strapi-server.json`), added as a `workspace:*` devDependency to both apps.
- `pnpm-workspace.yaml` already globs `apps/*`-style entries explicitly (`packages: [apps/frontend, apps/backend]`) — needs a `packages/*` entry added for the new package to be picked up.
- No runtime behavior change intended; `strapi build`/`strapi develop` gain a `tsc` compile step (`dist/`) that doesn't exist today for the backend.
