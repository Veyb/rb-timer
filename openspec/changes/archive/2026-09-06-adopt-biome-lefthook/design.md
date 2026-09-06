## Context

See proposal.md - Why/What Changes for motivation and scope. Concrete facts gathered during exploration that shape this design:

- `apps/frontend/eslint.config.mjs` today is a flat config spreading only `eslint-config-next/core-web-vitals` - no custom rules, no Prettier, no formatter of any kind exists anywhere in the repo.
- `apps/backend/.eslintrc` uses `parser: "babel-eslint"` (long-deprecated, superseded by `@babel/eslint-parser`), extends only `eslint:recommended`, and has no `lint` script wired in `package.json` at all. It doesn't understand TypeScript syntax, so it's been silently non-functional for `.ts` files since the recent TS migration - removing it is pure cleanup, not a coverage loss.
- Strapi's own official TypeScript migration guide (`docs.strapi.io/cms/typescript/adding-support-to-existing-project`) recommends deleting `.eslintrc`/`.eslintignore` outright - Strapi has no opinion on linting tooling.
- Biome ships a **native, stable** `next` domain (`biomejs.dev/linter/domains`) with 12 rules, auto-activating per-package when `next: >=14.0.0` is a declared dependency: `noBeforeInteractiveScriptOutsideDocument`, `noNextAsyncClientComponent`, `useExhaustiveDependencies`, `useHookAtTopLevel`, `useInlineScriptId`, `noImgElement`, `noSyncScripts`, `noUnwantedPolyfillio`, `useGoogleFontPreconnect`, `noHeadElement`, `noDocumentImportInPage`, `noHeadImportInDocument`. This directly covers roughly two-thirds of `@next/eslint-plugin-next`'s 17 rules, including the react-hooks rules Next.js also cares about.
- The genuinely uncovered `@next/eslint-plugin-next` rules were checked directly against this codebase and have **zero matches today**: no raw `<a href="/...">` internal navigation (`no-html-link-for-pages`), no `next/font/google` usage (`google-font-display`), no manual `<link rel="stylesheet">` tags (`no-css-tags`), and no `pages/_document.js` at all (`no-duplicate-head`, `no-styled-jsx-in-document`, `no-title-in-document-head`, `no-typos` are Pages-Router-only - this is a pure App Router project, confirmed via `next build`'s own route output).
- Next.js itself dropped `next lint` in v16 (confirmed against the current official docs, version 16.3.4) and is now explicitly linter-agnostic - no framework-level lock-in to ESLint either way.
- `lefthook`'s npm package has its own `postinstall` script that self-registers git hooks; pnpm blocks arbitrary postinstall scripts by default. `pnpm-workspace.yaml` already has an `allowBuilds` allow-list used for `@strapi/strapi`, `better-sqlite3`, `sharp`, etc. - the same mechanism covers `lefthook`.
- Verified directly: `pnpm -r run <script>` only errors (`ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`) when **none** of the selected packages define that script; it silently skips any package that lacks it as long as at least one other package has it. `packages/typescript-config` therefore needs no lint/format/check-types script stubs.
- Neither app has a single `src/` root (`apps/frontend` is flat: `app/`, `components/`, `contexts/`, `lib/`, `theme/`, etc.; `apps/backend` is `src/`, `config/`, `database/`, `public/`, `scripts/`). Both already have `.gitignore` files that correctly exclude build/artifact directories (`.next/`, `test-results/`, `dist/`, `.tmp/`, `*.tsbuildinfo`, etc.).

## Goals / Non-Goals

**Goals:**
- One linter + formatter (Biome) for both apps, replacing a frontend-only linter (no formatter) and a backend linter that's been broken since the TS migration.
- A pre-commit safety net (lefthook) that didn't exist before in this project at all.
- Land green: fix every real finding Biome surfaces, not suppress rules to make the initial commit pass.

**Non-Goals:**
- No attempt to reach 100% rule-for-rule parity with `@next/eslint-plugin-next` - the empirical check above shows the remaining gap has zero real matches in this codebase today; revisit only if that changes (e.g. someone adds `next/font/google` or a raw `<a>` tag later).
- No Biome config for `packages/typescript-config` (no real source to lint - just JSON tsconfig fragments; the root `biome.json` still formats/lints it if invoked directly, no package-level scripts needed).
- No change to CI (no CI pipeline exists in this repo today) - this is local dev tooling and a local git hook only.

## Decisions

**Single root `biome.json`, no per-package configs.** Biome discovers the nearest ancestor config automatically; a single root file is simpler to maintain than per-package configs and matches how the `next` domain's per-package auto-activation is *supposed* to work (activates based on the invoking package's own `next` dependency, not a global toggle). If empirical testing during implementation shows the `next` domain doesn't correctly scope itself to `apps/frontend` only when invoked from a monorepo root config, the fallback is a small `apps/frontend/biome.json` that `extends` the root config and explicitly sets `"domains": {"next": "recommended"}` - noted as a risk below, not assumed away.

**`vcs.useIgnoreFile: true` instead of hand-maintained ignore lists.** Neither app has a single `src/` directory to scope commands to (unlike the reference project at `/Users/otsyro/Projects/swift/blank-slate-frontend`, which sidesteps this by pointing every script at `./src` and disabling `useIgnoreFile`). Both apps' existing `.gitignore` files already correctly exclude every build/artifact directory that matters (`.next/`, `dist/`, `.tmp/`, `test-results/`, `*.tsbuildinfo`), so reusing them is less to maintain than duplicating an ignore list in `biome.json`.
- *Alternative considered*: scope every script to explicit directories (`app/ components/ contexts/ lib/ ...` for frontend, `src/ config/` for backend) the way the reference project does. Rejected - more moving parts to keep in sync as directories are added, for no benefit given `.gitignore` already does the job.

**`noConsole` set to error, allowing `assert`/`error`/`info`/`warn`** (matches the reference project's own convention). Checked first: almost no `console.log` exists in either app today (one frontend file, one backend `.example.js` template not part of the active build) - this is a real, deliberate stricter policy going forward, not a no-op, but the cost of fixing it is close to zero.

**Biome fully replaces ESLint in both apps - no hybrid/dual-tool setup.** Considered and rejected keeping a narrow ESLint scoped only to the ~3 uncovered Next.js rules, specifically because the empirical check found zero current matches for any of them - a second tool with zero active findings is pure maintenance cost for no present benefit. Revisit if the codebase later adopts `next/font/google` or raw anchor-tag navigation.

**Root aggregate scripts (`lint`, `lint:fix`, `format`, `format:fix`, `check`, `check:fix`, `check-types`) all fan out via `pnpm -r <script>`,** per the user's requested script names and the reference project's pattern. Each app gets its own Biome-CLI-backed script (`biome lint`/`biome format`/`biome check` against `.`, relying on `vcs.useIgnoreFile`), plus `check-types: tsc --noEmit` and `clean: rm -rf <build-dir>` (`.next` for frontend, `dist` for backend).

**`clean` scripts use `rm -rf`, not `del-cli`.** The project already uses `rm -rf` elsewhere (`scripts/e2e-fixture-role.js`'s conventions, `AGENTS.md`'s macOS/Linux-oriented tooling) - adding `del-cli` as a new dependency purely for Windows portability isn't justified when nothing else in the project is cross-platform-shell-safe today.

**lefthook's `pre-commit` hook checks the whole repo, not just staged files** (`pnpm run check` + `pnpm run check-types` in parallel, matching the reference project). Given the repo's current size, a full-repo check completes in seconds; scoping to staged files only would need lefthook's glob-filtering config for marginal speed gain that isn't needed yet.

**`@biomejs/biome` is pinned to `2.5.11`, not the absolute-latest `2.5.12`.** `pnpm-workspace.yaml`'s existing `minimumReleaseAge: 10080` (7-day) supply-chain policy blocked `2.5.12` outright at install time (published only 3 days before this change was implemented). Checked the registry's publish timestamps directly and picked `2.5.11` (~10 days old), the newest version that already clears the gate, rather than adding `@biomejs/biome` to `minimumReleaseAgeExclude` - that exclude list is reserved for first-party framework packages (`@strapi/*`) this project depends on foundationally, not a general-purpose escape hatch for whatever a change happens to want to install newest. `lefthook@2.1.12` (~9 days old) already cleared the gate with no action needed.

## Risks / Trade-offs

- **[Risk]** Biome's `next` domain auto-activation might not scope correctly to `apps/frontend` alone from a single root `biome.json` in a pnpm workspace (untested by anyone in this exploration - the reference project doesn't use Next.js at all, so there's no existing example to copy). → **Mitigation**: verify directly during implementation (run `biome lint` from within `apps/backend` and confirm no `next`-domain diagnostics appear there); fall back to a package-scoped `apps/frontend/biome.json` extending the root config if auto-detection doesn't scope correctly.
- **[Risk]** Removing ESLint drops the ~8 `@next/eslint-plugin-next` rules with no Biome equivalent (`no-html-link-for-pages`, `google-font-display`, `next-script-for-ga`, `no-assign-module-variable`, `no-css-tags`, `no-page-custom-font`, `no-script-component-in-head`, and the Pages-Router-only ones). → **Mitigation**: accepted, since none currently match anything in the codebase; the rules that would matter for an App Router app (async client components, `<img>` usage, sync scripts, exhaustive-deps, rules-of-hooks) are all covered by Biome's native `next`/`react` domains.
- **[Risk]** `noConsole: error` and Biome's broader default rule set may surface real findings across both apps that need fixing, not just mechanical ones (unknown until Biome actually runs) → **Mitigation**: tasks.md's verification steps run Biome for real and fix what it finds before considering the change done, per this project's "land green" convention (same approach used in `modernize-frontend-tsconfig`).
- **[Risk]** `lefthook`'s `postinstall` needs `allowBuilds` before hooks self-register; forgetting this leaves the hook silently not installed. → **Mitigation**: `pnpm install` output and `lefthook version`/`.git/hooks/pre-commit` presence are explicit verification steps in tasks.md, not assumed.
- **[Risk, confirmed real]** Biome's default diagnostic limit silently truncates `biome check`'s output ("Diagnostics not shown: N") without erroring - a plain `pnpm run lint` looked like ~20 findings when the real count was 53 (frontend) + 12 (backend). → **Mitigation**: always pass `--max-diagnostics=500` (or similar) when getting a fix-scope count for real, not just when something looks suspiciously small; tasks.md's 6.2 entry has the full, true breakdown.

## Post-Decisions (found while fixing real findings, not anticipated above)

**CSS Modules' `.module.css.d.ts` files in this codebase are manually maintained, not build-generated** - confirmed via `git ls-files`. Renaming or adding a CSS class (as task 6.2 did once, converting a `<span>` to a `<button>` with a new `.filterButton` class) requires updating the co-located `.d.ts` by hand in the same change, or `tsc` fails on the now-stale declared shape. Not a new file-naming convention to introduce, just a maintenance-cost fact worth stating since it's non-obvious and doesn't self-heal on `next build` the way `next-env.d.ts` does.

**`next-env.d.ts` needed the same treatment as `**/*.example.js`**: excluded entirely from `biome.json`'s `files.includes`, not reformatted. It's Next.js's own auto-regenerated file (rewritten by every `next dev`/`next build` in its own double-quote style, per `AGENTS.md`) - fighting its formatting would just lose to the next build.

**When Biome's suggested "unsafe fix" for `useExhaustiveDependencies` would change behavior, it wasn't applied - each of the 6 findings was individually verified against the actual closure/DOM semantics**, not treated as a uniform category. 5 were genuinely safe (React-guaranteed-stable `useState` setters and `useRef` objects). The 6th required tracing actual CSS cascade behavior (`ScrollableHolder`'s `max-height` vs. the inner ref'd div's own box size vs. `ResizeObserver`'s actual detection scope) to establish that removing `children` from that effect's deps would silently break scrollbar-thumb sizing on list-length changes - accepted design.md's own Risk #3's premise ("real findings, not just mechanical") turned out to include at least one case where the *linter's own suggested fix* was the thing to reject, not the original code.

## Migration Plan

1. Add `@biomejs/biome: 2.5.11` and `lefthook` to a new `catalog:` entry in `pnpm-workspace.yaml` (extending the existing default catalog from `adopt-typescript-backend`); add `lefthook: true` to `allowBuilds`.
2. Add `@biomejs/biome`/`lefthook` as `catalog:`-referenced devDependencies to root `package.json` (and `@biomejs/biome` to each app that needs its own `biome` CLI script).
3. Create root `biome.json` per the Decisions above.
4. Remove `apps/frontend/eslint.config.mjs`, `eslint`, `eslint-config-next` from `apps/frontend/package.json`. Remove `apps/backend/.eslintrc`, `.eslintignore`.
5. Add `lint`/`lint:fix`/`format`/`format:fix`/`check`/`check:fix`/`check-types`/`clean` scripts to both `apps/frontend/package.json` and `apps/backend/package.json`.
6. Add the same aggregate scripts plus `reinstall`/`rebuild`/`clean:modules`/`clean:builds`/`build` to root `package.json`.
7. Run `pnpm install`; verify Biome and lefthook are linked; verify `.git/hooks/pre-commit` exists after install (lefthook's postinstall registers it).
8. Run `pnpm run check` for real across both apps; fix every finding (formatting auto-fixed via `check:fix`, lint findings fixed by hand per the project's "land green" convention).
9. Run `pnpm run check-types`; confirm clean (should be, since this is the same `tsc --noEmit` already verified clean in `adopt-typescript-backend`).
10. Create `lefthook.yml`; verify a real `git commit` triggers the hook and blocks on a deliberately introduced formatting error, then passes once fixed.

No rollback beyond `git revert` needed - local/dev tooling only, no production or data impact.
