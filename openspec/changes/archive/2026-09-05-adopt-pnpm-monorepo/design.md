## Context

`frontend/` and `backend/` are independent pnpm projects today (own `node_modules`, own `pnpm-lock.yaml`, own `pnpm-workspace.yaml` used only to hold pnpm-10+ settings like `allowBuilds`/`trustPolicy` that no longer live in `.npmrc`). See proposal.md - Why for the goal. The constraint that shapes this whole design: a shared root `pnpm-workspace.yaml` was already tried once in this project (`docs/MIGRATION.md`, Stage 4) and reverted after backend-only `@types/react`/`styled-components` instances leaked into frontend's `next build` typecheck — patched once via an `overrides` pin, recurred with a different package, prompted the structural revert. Any design that re-attempts this has to reckon with that precedent directly, not just note it.

## Goals / Non-Goals

**Goals:**
- One root install (`pnpm install` at the repo root) covering both apps, one lockfile.
- Root positioned to hold biome/lefthook config later, with no dependency-graph changes needed at that point.
- No regression in either app's build or typecheck correctness relative to today's standalone setup.

**Non-Goals:**
- Configuring biome or lefthook (separate, later change).
- Sharing code or types between `apps/frontend` and `apps/backend` (no `packages/*` introduced — only two members today).
- Any change to application runtime behavior.

## Decisions

**1. Full pnpm workspace merge, not a lighter "root package.json for tooling only" layout.**
A root `package.json` with just `biome`+`lefthook` as devDependencies, and no `pnpm-workspace.yaml` joining the two apps, would sidestep the entire dependency-graph question and was seriously considered - lefthook is package-manager-agnostic and Biome can lint across both folders via its own globs. Rejected because it doesn't deliver what was actually asked for (a classic pnpm monorepo, single install), and because the Stage 4 risk it would sidestep has since been re-verified as not applicable to the current toolchain (see Risks below) - there's no longer a reason to take the lighter, more limited option.

**2. `apps/frontend` / `apps/backend`, not a flat `frontend/` / `backend/` layout.**
Orthogonal to the merge itself - the workspace `packages:` glob works identically either way. Chosen for future extensibility (room for a `packages/*` if shared code ever appears) at low migration cost: only `README.md`, `docs/MIGRATION.md`, and two path comments (`apps/frontend/e2e/fixtures/constants.ts`, `apps/backend/scripts/e2e-fixture-role.js`) reference the old paths outside archived history; no CI exists yet to update; `.vscode/launch.json` and both `.mcp.json` files use `${workspaceFolder}`, not hardcoded paths.

**3. Explicit `autoInstallPeers: true` / `strictPeerDependencies: false` in the root `pnpm-workspace.yaml`, in camelCase.**
Confirmed these are already pnpm 11.x's built-in defaults (a bare install with zero `.npmrc`/config anywhere already succeeds despite peer warnings) - not required for correctness. Set explicitly anyway as defensive documentation: protects against a future pnpm major changing the default, or a contributor's personal global `~/.npmrc` overriding it. Must use `autoInstallPeers`/`strictPeerDependencies` - confirmed the kebab-case `.npmrc`-style spelling (`auto-install-peers`/`strict-peer-dependencies`) is silently ignored in `pnpm-workspace.yaml` with a warning ("ignored because they are not written in camelCase").

**4. Remove `packageManager` entirely from both `apps/*/package.json`, keep one canonical pin at root (`pnpm@11.25.0`, the higher of today's two values).**
Not optional cleanup - see Risks. Alternative considered (align both leaf fields to match root exactly instead of removing them) works too, but removing is simpler to keep in sync going forward since only one file then declares a version at all.

## Risks / Trade-offs

**[Risk] Recurrence of the Stage 4 cross-contamination bug** (a same-named dependency in both apps' trees leaking into one app's typecheck) → **Mitigation**: re-tested the exact failure mode end-to-end against today's real source and dependency versions, in both directions the shared dependencies could leak:
- Diffed both `package.json`s directly - the only direct-dependency overlap is `react`, `react-dom`, `styled-components` (confirmed exhaustively, not just the two Stage 4 happened to name).
- Copied real `frontend`/`backend` source (not just manifests) into a merged workspace and ran `next build` (frontend) - identical clean output to a standalone baseline: compiled successfully, TypeScript finished clean, same 7 routes, exit 0.
- Ran `strapi build` (backend - the side that bundles `react@18`/`react-dom@18`/`react-router-dom`/`styled-components` directly for the admin panel) in the same merged copy - identical clean output to a standalone baseline (~11.6s vs ~11.8s, exit 0).
- Confirmed in the resulting lockfile that all three overlapping packages resolve to physically distinct, peer-keyed instances per importer, e.g. `styled-components@6.5.3(react-dom@18.3.1(react@18.3.1))` for backend vs. `styled-components@6.5.3(react-dom@19.2.8(react@19.2.8))` for frontend - not one shared instance.
- Best-effort explanation, not fully confirmed: Stage 4 happened while frontend was still on the pre-major-bump Next.js/Pages-Router/webpack-era toolchain; today's Next 16 + Turbopack pipeline appears to respect pnpm's per-importer isolation more strictly.
- **Standing rule for whoever implements this**: if the same *class* of error reappears in the real repo (not the scratch copy) - a shared-name dependency reachable in the wrong app's typecheck - stop and reconsider structurally. Do not patch it away with per-package `overrides` one at a time; that whack-a-mole approach is exactly what Stage 4 tried before reverting.

**[Risk] `packageManager` field mismatch between root and a workspace member hard-blocks that member entirely** → confirmed by reproduction, not inferred: with root pinned to one version and a leaf package's own (stale) field pointing at another, every `pnpm` command run from inside that leaf fails outright:
```
[ERROR] This project is configured to use 11.25.0 of pnpm. Your current pnpm is v11.24.0
Corepack invoked pnpm with this version, and pnpm does not switch versions when running under corepack.
```
This is worse than silent version drift - it's a hard stop. Since `backend/package.json` pins `11.24.0` and `frontend/package.json` pins `11.25.0` today, this **will** happen immediately post-move unless fixed. **Mitigation**: remove the field from both leaf `package.json` files as part of the same commit that adds the root workspace files - not a follow-up cleanup step.

**[Risk] Merging the two projects' `allowBuilds`/`trustPolicy`/`minimumReleaseAge`/`minimumReleaseAgeExclude` settings into one root `pnpm-workspace.yaml` could drop a needed allowance or over-broaden a policy** → **Mitigation**: diffed both files - the only overlapping keys (`sharp`, `styled-components`) already agree (`true` in both). `minimumReleaseAgeExclude: ['@strapi/*']` becomes workspace-wide but is a no-op for frontend (no `@strapi/*` deps there). Verified with a real `pnpm install` against the merged config: no "ignored build scripts" warning, and the native modules that actually matter - `better-sqlite3`, `sharp` - have real compiled/prebuilt `.node` binaries present for the target platform afterward, not just resolved-but-unbuilt packages.

**[Risk] A pre-existing peer-dependency warning could be mistaken for one this migration introduced** → the only `pnpm peers check` finding (`unmet peer codemirror`, wanted by `@uiw/react-codemirror` inside Strapi's own admin bundle) is confirmed to already exist in today's real, currently-working standalone `backend` - it's pre-existing and Strapi-internal, unrelated to `react` or to this migration.

**[Trade-off] Leftover `pnpm-workspace.yaml`/`pnpm-lock.yaml` inside the old `backend/`/`frontend/` locations become dead weight** once nested under a root workspace - confirmed pnpm silently ignores a non-root `pnpm-workspace.yaml` rather than erroring on it, so forgetting to delete them wouldn't break anything, but they should still be removed for clarity (see Migration Plan).

## Migration Plan

1. `git mv frontend apps/frontend`, `git mv backend apps/backend`.
2. Add root `package.json` (`private: true`, `packageManager: "pnpm@11.25.0"`) and root `pnpm-workspace.yaml`: `packages: [apps/frontend, apps/backend]`, the merged `allowBuilds`/`trustPolicy`/`minimumReleaseAge`/`minimumReleaseAgeExclude` from both old per-project files, plus `autoInstallPeers: true` / `strictPeerDependencies: false`.
3. Delete `apps/frontend/pnpm-workspace.yaml`, `apps/backend/pnpm-workspace.yaml`, `apps/frontend/pnpm-lock.yaml`, `apps/backend/pnpm-lock.yaml`.
4. Remove the `packageManager` field from both moved `package.json` files.
5. Run `pnpm install` at root; confirm a single lockfile and no unexpected "ignored build scripts" warning.
6. **Gate** (must pass before this change is considered complete): `pnpm --filter frontend build` and `pnpm --filter backend build`, run for real against the actual moved repo - not just the scratch reproduction this design relied on. Both must stay as clean as today's standalone baselines.
7. Update `README.md`'s install instructions (root `pnpm install`; still two terminals for `dev`) and add a note next to `docs/MIGRATION.md`'s Stage 4 entry recording that its root cause was re-tested and did not reproduce with current versions/toolchain.
8. Update the path comments in `apps/frontend/e2e/fixtures/constants.ts` and `apps/backend/scripts/e2e-fixture-role.js`.

**Rollback**: if step 6's gate fails and the Stage 4 failure class genuinely reappears, revert to two independent projects exactly as Stage 4 did - this is a plain revert (no application code or data is touched by this change), not a per-package patching exercise.

## Open Questions

None - the one deferrable-looking choice (which pnpm patch version to canonicalize on) is resolved above (`11.25.0`) since it doesn't affect the approach.
