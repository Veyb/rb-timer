## Why

`frontend/tsconfig.json` still carries `target: "es5"` from the original 2022 scaffold. The IDE flags it as deprecated (the option is removed entirely in TypeScript 7.0). Fixing it is the trigger to also close the gap between the installed TypeScript (5.9.3) and a strict, modern config style, without regressing the Next.js App Router setup or breaking the pnpm-based build.

## What Changes

- Bump `typescript` in `frontend/package.json` from `5.9.3` to `6.0.3` (last release on the classic compiler; TS 7.0's native `tsgo` compiler is out of `typescript-eslint`'s supported range `>=4.8.4 <6.1.0`, which `eslint-config-next@16.3.1` pins, so 7.0 is explicitly out of scope for now).
- Rewrite `frontend/tsconfig.json`:
  - `target`: `es5` → `ES2017` (Next's own recommended default per its `writeConfigurationDefaults`, needed for top-level `await`).
  - `lib`: pin to `["ES2022", "DOM", "DOM.Iterable"]` instead of the open-ended `"esnext"`.
  - `module`: `esnext` → `preserve` (Next's TS≥5.4 recommended default; implies `moduleResolution: bundler`, `esModuleInterop: true`, `resolveJsonModule: true`).
  - Adopt a stricter type-checking baseline: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `allowUnusedLabels: false`, `allowUnreachableCode: false`, `verbatimModuleSyntax: true`.
  - Keep `"plugins": [{ "name": "next" }]` and the existing `include`/`exclude` block (`next-env.d.ts`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`, exclude `node_modules`) — required for Next's typed routes and editor diagnostics; do not adopt the version of this config that drops them.
  - Keep `incremental: true`.
  - Do **not** adopt `declaration`, `declarationMap`, `sourceMap`, `importHelpers`, `emitBOM`, `removeComments`, `newLine`, `experimentalDecorators`, `emitDecoratorMetadata`, `maxNodeModuleJsDepth`, or `skipDefaultLibCheck` — these are emit/library-authoring options with no effect (or actively harmful effects, in the case of `declaration`) on a `noEmit: true` Next.js application that uses no decorators.
- Fix the errors the new strict flags surface in the existing codebase (measured against the current tree, not estimated):
  - ~55 `TS1484` type-only-import errors (`verbatimModuleSyntax`) across ~30 files — mechanical, autofixable via `@typescript-eslint/consistent-type-imports`.
  - ~13 unused-variable/parameter cleanups (`noUnusedLocals`/`noUnusedParameters`).
  - A handful of genuine null-safety fixes surfaced by `noUncheckedIndexedAccess`/`strictNullChecks` in `contexts/collection-context/collection-context.context.tsx` and `components/collections-block/collection-item/collection-item.component.tsx`.
- Bump `@types/node` in `frontend/package.json` from the stale `17.0.10` to a version matching the Node engine actually used (`>=20 <=22`), since it's masked today only by `skipLibCheck: true`.

## Capabilities

No product-facing capability or requirement changes — this is a tooling/type-checking configuration change only. `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `frontend/tsconfig.json`, `frontend/package.json` (`typescript`, `@types/node` versions).
- Every frontend `.ts`/`.tsx` file with a type-only import not currently marked `import type` (~30 files).
- A small number of files with latent null-safety issues once `noUncheckedIndexedAccess` is enabled (see design.md for the concrete list).
- No change to `backend/` (plain JS Strapi project, no tsconfig).
- No runtime/build-output change: `noEmit: true` throughout, actual transpilation stays with Next's SWC/Turbopack pipeline.
