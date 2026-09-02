## Context

See `proposal.md` for motivation. Constraints that shape the approach:

- `frontend` is a Next.js 16.3.1 App Router app (`app/`, no `pages/`) built with pnpm, SWC/Turbopack. `noEmit: true` — tsc is used only for type-checking, never for producing the shipped JS.
- `next-env.d.ts` and the `include` globs (`.next/types/**/*.ts`, `.next/dev/types/**/*.ts`) wire up Next's typed-routes generation; `plugins: [{ "name": "next" }]` wires up its editor-only diagnostics (documented incident in `AGENTS.md`: importing antd's `theme` into a Server Component silently resolves to `{}`, a class of bug the plugin is meant to help surface).
- `eslint-config-next@16.3.1` pins `typescript-eslint@^8.46.0`, whose latest release (`8.69.0`) declares a peer range `typescript: ">=4.8.4 <6.1.0"`. TypeScript 7.0 (the native `tsgo` compiler) is a different codebase and outside that range.
- Every option under consideration was validated by actually running `tsc --noEmit` against the current `frontend/` tree with each candidate flag set, not assumed from documentation.

## Goals / Non-Goals

**Goals:**
- Resolve the `target: "es5"` deprecation at its root cause, not by suppressing it with `ignoreDeprecations`.
- Land a stricter, modern tsconfig baseline while keeping the Next.js-specific wiring (`plugins`, `include`/`exclude`, `incremental`) intact.
- Fix every type error the new flags surface so the change lands green, not with a suppressed backlog.

**Non-Goals:**
- Moving to TypeScript 7.0 (`tsgo`). Revisit once `typescript-eslint` (and therefore `eslint-config-next`) officially supports it.
- Any App Router / Pages Router migration, or other architectural change — out of scope, tsconfig only.
- Adding a package-authoring emit pipeline (`declaration`, `sourceMap`, etc.) — `frontend` is an application with no consumers of its `.d.ts`/source maps beyond what Next's own bundler already produces.
- Introducing decorators — none exist in the codebase today.

## Decisions

**`target`: `es5` → `ES2017`, not `ES2022`.**
Next.js's own `writeConfigurationDefaults` (in `next/dist/lib/typescript/`) suggests `ES2017` specifically "for top-level `await`... Next.js only polyfills for the esmodules target." Going with Next's own recommendation rather than a more aggressive `ES2022` keeps this change aligned with what `next dev`/`next build` would themselves configure on a fresh project, minimizing surprise for anyone diffing against a stock Next.js tsconfig later.

**`module`: `esnext` → `preserve`.**
Same source: for TypeScript ≥5.4, Next's desired-config logic treats `preserve` as an accepted value and notes it implies `moduleResolution: bundler`, `esModuleInterop: true`, `resolveJsonModule: true` — i.e., it's the more modern, more self-documenting choice over spelling out `esnext` + the three implied options separately. Kept those three options explicit anyway in the final tsconfig for clarity/portability rather than relying on the implication, since explicit-over-implicit is easier for a future reader who doesn't know the `preserve` semantics offhand.

**`lib`: `["esnext"]` → `["ES2022", "DOM", "DOM.Iterable"]`.**
Pinning to a concrete ECMAScript version avoids silently gaining access to not-yet-stabilized globals as new TS releases update what `esnext` resolves to. `ES2022` was chosen (not `ES2017`, matching `target`) because `lib` and `target` are independent axes in TS — `lib` only controls which ambient declarations (built-ins) are visible, not what syntax gets type-checked as valid, and `ES2022` covers everything the codebase currently uses (nothing newer was found in a scan).

**Adopt `verbatimModuleSyntax` instead of the redundant `isolatedModules` + implicit type-import elision.**
`verbatimModuleSyntax: true` subsumes `isolatedModules`'s safety guarantees and forces `import type` to be explicit, which is stricter and more explicit than relying on TS to elide type-only imports implicitly. Measured cost: 55 `TS1484` errors across ~30 files (list below) — every one is "type X must be imported using a type-only import," fixed either manually or via `@typescript-eslint/consistent-type-imports --fix` (already available transitively through `eslint-config-next`'s `typescript-eslint` dependency; no new devDependency needed). `isolatedModules: true` is kept explicit alongside it for clarity even though `verbatimModuleSyntax` implies it (matches what Next's own required-options check tolerates).

**Adopt `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `allowUnusedLabels: false`, `allowUnreachableCode: false` together, in one pass.**
Measured cost: 29 errors total, concentrated in a handful of files. Splitting these across multiple changes would mean repeatedly re-running the full check and re-touching the same files; doing them together is a single, boundable pass given the size found. Breakdown:
- 13 `TS6133` (unused local/parameter) — mechanical deletions:
  `components/collections-block/collections-block.component.tsx`, `components/form-login/form-login.component.tsx`, `components/form-register/form-register.component.tsx`, `components/header/donations/donations.component.tsx`, `components/management-block/management-block.component.tsx`, `contexts/auth-context.tsx` (x2), `contexts/boss-context.tsx`, `contexts/collection-context/collection-context.context.tsx` (x3), `lib/api/boss.ts`, `theme/global-style.tsx`.
- 7 `TS2464` (computed property key typed as possibly `undefined`, surfaced by `noUncheckedIndexedAccess`) in `components/collections-block/filter-block/filter-block.component.tsx`, `components/collections-block/item-image/item-image.component.tsx` (x2), `components/input/input.component.tsx` (x3), `components/user-list-table/user-list-table.component.tsx`.
- 5 `TS2532` ("Object is possibly 'undefined'") — genuine null-safety gaps, not just noise, in `components/collections-block/collection-item/collection-item.component.tsx:49`, `components/header/donations/donations.component.tsx:48`, `contexts/collection-context/collection-context.context.tsx:88,122`, `contexts/collection-context/collection-context.utils.ts:32`.
- 2 `TS2322` (type not assignable — `undefined` flowing into a non-optional field) in `contexts/collection-context/collection-context.context.tsx:168` and `contexts/collection-context/collection-context.utils.ts:30`.
- 1 `TS7030` ("not all code paths return a value") in `proxy.ts:6`.
- 1 `TS2769` (no overload matches — `Object.values()` called with a possibly-`undefined` argument) in `components/collections-block/collection-item/collection-item.component.tsx:26`.

Each of these must be fixed with a real narrowing/guard, not `!`-asserted away, since several are plausible latent bugs (e.g. the `collection-context` ones cluster around the same file that already had a real Strapi-5-migration bug per prior project history).

**Reject `declaration`/`declarationMap`.**
Verified directly: turning on `declaration: true` alongside `noEmit: true` does not no-op — it activates TS's declaration-emit "portability" analysis even without writing files, and breaks on `lib/web-sockets.ts` and `styled-components/select.component.tsx` (x2) with `TS2742: "The inferred type ... cannot be named without a reference to .pnpm/... This is likely not portable."` This is pnpm's nested `node_modules/.pnpm/<pkg>@<version>/node_modules/...` layout tripping TS's portability checker — a known pnpm/TS interaction. Since nothing consumes this app's `.d.ts` output, there is no benefit to accepting this cost. `sourceMap`, `importHelpers`, `emitBOM`, `removeComments`, `newLine` are true no-ops under `noEmit: true` and are dropped for the same reason: they add reading cost with zero effect.

**Reject `experimentalDecorators`/`emitDecoratorMetadata`.**
Grepped the entire `frontend/` tree: zero decorator usage. Carrying these options implies a capability the codebase doesn't use and would need re-validating (interaction with `useDefineForClassFields`) the day someone actually adds a decorator-based library — better to add them then, deliberately.

**Reject `maxNodeModuleJsDepth`, `skipDefaultLibCheck`.**
`maxNodeModuleJsDepth` only affects behavior when `allowJs: true`; this project keeps `allowJs: false` (no stray `.js`/`.jsx` files found in source directories), making it a no-op. `skipDefaultLibCheck` is a legacy/undocumented option now redundant with `skipLibCheck: true`.

**Keep `plugins: [{ "name": "next" }]`, `include`/`exclude`, `incremental: true` unchanged.**
Removing any of these was the actual regression identified when comparing against the alternative config that was considered — see proposal.md. `include`/`exclude` stay scoped exactly as they are today (`next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`, excluding `node_modules`), since that scoping is what keeps tsc from scanning the rest of `.next`'s build output.

**`typescript`: `5.9.3` → `6.0.3`, not `7.0.2`.**
See proposal.md — `typescript-eslint`'s supported range excludes 7.0. 6.0.3 is the same compiler engine as 5.9.3 (last pre-`tsgo` release), so this is a low-risk version bump with no behavioral surprises beyond what's already covered by the config changes above.

**`@types/node`: `17.0.10` → a version matching the `engines` field (`>=20.0.0 <=22.x.x`, i.e. `@types/node@^22`).**
Currently masked entirely by `skipLibCheck: true` (verified: without `skipLibCheck`, `@types/node@17.0.10`'s `Buffer` typings conflict with modern `lib` `ArrayBuffer`/`SharedArrayBuffer` typing under `ES2022`). Leaving it stale is a latent trap for the next person who needs to turn `skipLibCheck` off for a real reason.

## Risks / Trade-offs

- [Risk] The `verbatimModuleSyntax` fix touches ~30 files in one pass, all mechanical but numerous → diff noise in review. **Mitigation**: keep this as its own commit/PR separate from the null-safety fixes, so reviewers can skim the type-only-import commit quickly and focus review time on the handful of real logic changes.
- [Risk] The 5 `TS2532`/2 `TS2322`/1 `TS2769` null-safety fixes require judgment calls about the *correct* runtime behavior when a value is actually `undefined` (not just "silence the type error"), particularly in `collection-context.context.tsx`, which already had one real Strapi-5-era bug (documented in project memory) caused by exactly this kind of unguarded access. **Mitigation**: fix these by tracing what the value can legitimately be at runtime (checking the corresponding Strapi API response shape), not by adding `!` assertions; flag any case where the correct behavior is ambiguous for manual testing before merging, per this project's established practice of no automated tests / manual verification per stage.
- [Risk] Bumping `typescript` to `6.0.3` may itself surface new diagnostics beyond what was measured on `5.9.3`'s checker (minor version differences in strictness). **Mitigation**: bump the dependency first, then run the full `tsc --noEmit` before starting the flag-by-flag fixes, so any additional errors are caught and folded into the same pass rather than discovered mid-way.

## Migration Plan

1. Bump `typescript` to `6.0.3` and `@types/node` to `^22` in `frontend/package.json`; reinstall; run `tsc --noEmit` with the *current* tsconfig to confirm no new errors from the version bumps alone.
2. Rewrite `frontend/tsconfig.json` per the Decisions above.
3. Run `tsc --noEmit`, fix `TS1484` errors (verbatim module syntax) — mechanical pass, optionally via `typescript-eslint`'s `consistent-type-imports` autofix.
4. Re-run `tsc --noEmit`, fix remaining `TS6133` (unused) errors — mechanical pass.
5. Re-run `tsc --noEmit`, fix the remaining null-safety errors (`TS2532`, `TS2322`, `TS2769`, `TS7030`) with real guards, tracing each back to what the underlying Strapi API can actually return.
6. Final `tsc --noEmit` must be clean; run `next build` and manually smoke-test the affected screens (boss list, collections, donations, user management) per this project's established "no automated tests, verify manually" practice.
7. Rollback: revert the `frontend/tsconfig.json` and `package.json` changes in a single commit; no data/schema/runtime migration involved, so rollback is a plain git revert.
