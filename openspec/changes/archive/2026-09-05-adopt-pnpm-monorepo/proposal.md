## Why

`frontend/` and `backend/` are two fully independent pnpm projects today — no root `package.json`, no shared workspace, own `node_modules`/`pnpm-lock.yaml` each. A shared root install for **biome** and **lefthook** is planned next, but neither tool needs a merged dependency graph to work — this change exists specifically to get the repo onto a classic pnpm workspace layout first, since that's what was asked for. It's worth being upfront that this exact setup was tried once before and reverted (see `docs/MIGRATION.md`, Stage 4): a shared root `pnpm-workspace.yaml` let backend-only `@types/react`/`styled-components` instances leak into frontend's `next build` typecheck. This proposal only exists because that specific failure mode was re-tested end-to-end against today's actual dependency versions and toolchain (Next 16/Turbopack, current Strapi/React) and did not reproduce — see design.md for the evidence.

## What Changes

- Move `frontend/` → `apps/frontend/` and `backend/` → `apps/backend/` (`git mv`, preserving history).
- Add a root `package.json` (`private: true`, one canonical `packageManager` pin) and a root `pnpm-workspace.yaml` (`packages: [apps/frontend, apps/backend]`), merging the `allowBuilds`/`trustPolicy`/`minimumReleaseAge`/`minimumReleaseAgeExclude` settings currently split across the two per-project `pnpm-workspace.yaml` files, plus explicit `autoInstallPeers: true` / `strictPeerDependencies: false` (camelCase — the kebab-case `.npmrc`-style spelling is silently ignored in `pnpm-workspace.yaml`).
- Remove the two independent `pnpm-workspace.yaml` + `pnpm-lock.yaml` pairs (`backend/`, `frontend/`) — replaced by one root `pnpm-lock.yaml`.
- **BREAKING**: remove the `packageManager` field from `apps/frontend/package.json` and `apps/backend/package.json`. Confirmed by testing that leaving a stale/mismatched field in either causes `pnpm` to hard-error (not silently use the wrong version) for every command run from inside that package once it's part of a workspace whose root declares a different version.
- **BREAKING** (local dev workflow only, no product impact): local setup changes from "two independent `cd <dir> && pnpm install`" to one root `pnpm install`. Existing contributors need to redo their local install once.
- Update [README.md](../../../README.md) and [docs/MIGRATION.md](../../../docs/MIGRATION.md) to reflect the new root-install workflow and to record, next to the Stage 4 entry, that its root cause was re-tested and did not reproduce with current versions.

Explicitly **out of scope**: configuring biome or lefthook themselves — this change only prepares the layout they'll land on.

## Capabilities

No product-facing capability or requirement changes — this is a repo-structure/tooling change only, with no observable change in application behavior. `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- New: root `package.json`, root `pnpm-workspace.yaml`, root `pnpm-lock.yaml`.
- Moved: `frontend/**` → `apps/frontend/**`, `backend/**` → `apps/backend/**`.
- Removed: `apps/frontend/pnpm-workspace.yaml`, `apps/backend/pnpm-workspace.yaml`, `apps/frontend/pnpm-lock.yaml`, `apps/backend/pnpm-lock.yaml`, the `packageManager` field from both moved `package.json` files.
- Docs: [README.md](../../../README.md), [docs/MIGRATION.md](../../../docs/MIGRATION.md).
- Path-comment-only touch-ups (no logic change): `apps/frontend/e2e/fixtures/constants.ts`, `apps/backend/scripts/e2e-fixture-role.js`.
- No CI to update (none exists yet). No change to application runtime behavior, no change to biome/lefthook (not configured yet).
