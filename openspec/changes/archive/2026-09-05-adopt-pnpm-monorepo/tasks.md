## 1. Root workspace files

- [x] 1.1 Create root `package.json` (`private: true`, `packageManager: "pnpm@11.25.0"`) and verify it parses as valid JSON.
- [x] 1.2 Create root `pnpm-workspace.yaml` with `packages: [apps/frontend, apps/backend]`, the merged `allowBuilds`/`trustPolicy`/`minimumReleaseAge`/`minimumReleaseAgeExclude` from both existing per-project files, plus `autoInstallPeers: true` / `strictPeerDependencies: false` (camelCase), and verify `pnpm install --lockfile-only` produces no "ignored because they are not written in camelCase" warning.

## 2. Move apps into place

- [x] 2.1 `git mv frontend apps/frontend` and verify `git status`/`git diff --stat` shows renames, not delete+add pairs.
- [x] 2.2 `git mv backend apps/backend` and verify the same.

## 3. Remove now-redundant per-project artifacts

- [x] 3.1 Delete `apps/frontend/pnpm-workspace.yaml` and `apps/backend/pnpm-workspace.yaml` and verify every setting from both is represented in the root file (cross-check against task 1.2).
- [x] 3.2 Delete `apps/frontend/pnpm-lock.yaml` and `apps/backend/pnpm-lock.yaml` (superseded by the root lockfile).
- [x] 3.3 Remove the `packageManager` field from `apps/frontend/package.json` and `apps/backend/package.json` and verify with `grep packageManager` that neither file declares it anymore.

## 4. Install and verify dependency resolution

- [x] 4.1 Run `pnpm install` at the repo root and verify it completes with exit 0 and produces a single root `pnpm-lock.yaml`.
- [x] 4.2 Run `pnpm peers check` at the root and verify the only reported issue is the pre-existing unmet `codemirror` peer - no new `react`/`react-dom`/`styled-components`-related issue.
- [x] 4.3 Verify `better-sqlite3` and `sharp` have real platform-matching native binaries present under `node_modules/.pnpm` (not just resolved-but-unbuilt packages).

## 5. Build gate - Stage 4 regression check against the real repo

- [x] 5.1 Run `pnpm --filter frontend build` and verify it completes clean (compiled successfully, TypeScript finished with no errors, same routes as before the move) - this is the concrete re-check of the Stage 4 failure mode against the real repo, not the scratch reproduction design.md relied on. **Result**: clean - "Compiled successfully in 5.5s", "Finished TypeScript in 2.9s", same 7 routes, exit 0.
- [x] 5.2 Run `pnpm --filter backend build` and verify the admin panel build completes with exit 0. **Result**: clean - "Building admin panel (11750ms)", exit 0, in line with the pre-move baseline (~11.6-11.9s).
- [x] 5.3 If either 5.1 or 5.2 surfaces the Stage 4 failure class (a shared-name dependency reachable in the wrong app's typecheck), stop and follow design.md's Rollback section - do not patch with per-package `overrides`. **Result**: condition did not trigger - both builds were clean, so no rollback needed.

## 6. Documentation

- [x] 6.1 Update README.md's install/dev instructions to describe a single root `pnpm install` (dev still run as two terminals) and verify the commands work as written.
- [x] 6.2 Add a note next to docs/MIGRATION.md's Stage 4 entry recording that its root cause was re-tested against current versions/toolchain and did not reproduce, pointing to this change.
- [x] 6.3 Update the path comments in `apps/frontend/e2e/fixtures/constants.ts` and `apps/backend/scripts/e2e-fixture-role.js` to reflect the new `apps/` paths.
