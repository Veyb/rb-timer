## Why

`apps/frontend` only lints (via `eslint`, `next/core-web-vitals`) with no formatter; `apps/backend`'s `.eslintrc` uses the long-deprecated `babel-eslint` parser, doesn't understand TypeScript at all (broken since the recent TS migration), and was never wired to a `lint` script in the first place. Neither app enforces formatting, and there are no git hooks - nothing stops an unformatted or type-broken commit today. Biome gives one fast tool for both linting and formatting across the whole monorepo instead of two different, partially-broken setups; lefthook adds the pre-commit safety net that's been missing since the project started.

## What Changes

- **BREAKING** (tooling only, no runtime behavior change): remove `eslint`, `eslint-config-next`, `apps/frontend/eslint.config.mjs` from `apps/frontend`, and `apps/backend/.eslintrc`/`.eslintignore` (already non-functional for `.ts` files) from `apps/backend`.
- Add `@biomejs/biome` (`2.5.11`) and `lefthook` as new workspace dependencies via a pnpm catalog entry; allow-list `lefthook`'s postinstall via `pnpm-workspace.yaml`'s existing `allowBuilds` mechanism.
- Add one root `biome.json`: linter + formatter enabled, Biome's native stable `next` domain (auto-activates per-package via the `next` dependency - covers most of `@next/eslint-plugin-next`'s rules natively, confirmed empirically against this codebase), `noConsole` (error, allowing `assert`/`error`/`info`/`warn`), `vcs.useIgnoreFile: true` (reuse each app's existing `.gitignore` instead of hand-maintained ignore lists).
- Add `lint`/`lint:fix`/`format`/`format:fix`/`check`/`check:fix`/`check-types`/`clean` scripts to `apps/frontend` and `apps/backend` (Biome CLI + `tsc --noEmit` + `rm -rf`), and matching aggregate scripts at the repo root (`pnpm -r <script>`), plus `reinstall`/`rebuild`/`clean:modules`/`clean:builds`/`build`.
- Add `lefthook.yml`: a `pre-commit` hook running `pnpm run check` and `pnpm run check-types` across the whole repo in parallel.
- Fix every lint/format finding Biome surfaces across both apps so the change lands green, not with a suppressed backlog (matching the precedent set by `modernize-frontend-tsconfig`).

## Capabilities

No product-facing capability or requirement changes - this is a tooling/dev-workflow change only (mirrors the precedent set by the archived `modernize-frontend-tsconfig` and `adopt-typescript-backend` changes). `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `apps/frontend/package.json`, `apps/backend/package.json`, `pnpm-workspace.yaml`, root `package.json`: new scripts and dependencies.
- New root `biome.json`, `lefthook.yml`.
- Removed: `apps/frontend/eslint.config.mjs`, `apps/backend/.eslintrc`, `apps/backend/.eslintignore`, and the `eslint`/`eslint-config-next` dependencies.
- Every file Biome's linter/formatter flags across `apps/frontend` and `apps/backend` (exact list TBD by design.md/tasks.md once Biome is actually run against the tree).
- No change to `packages/typescript-config` (no real source to lint/format there; `pnpm -r` scripts skip it gracefully since it defines none of these scripts).
- No production runtime impact - purely local dev tooling and a new pre-commit hook.
