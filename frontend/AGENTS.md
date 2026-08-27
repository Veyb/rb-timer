<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Turbopack + Pages Router + CSS-in-JS: known broken combination

`dev`/`build` currently run with `--webpack` (see `package.json`). This is **not** a stylistic choice — Turbopack has a confirmed, still-open upstream bug where a custom `_document.tsx` with CSS-in-JS SSR extraction (styled-components + `@ant-design/cssinjs` here) reads an empty/wrong style cache, so the server-rendered HTML ships with no antd theme CSS at all (visible with JavaScript disabled). Two independent CSS-in-JS libraries hit the identical failure under Turbopack + Pages Router ([vercel/next.js#77513](https://github.com/vercel/next.js/issues/77513) for antd/cssinjs, [#82607](https://github.com/vercel/next.js/issues/82607) for Material UI) — App Router + Turbopack is unaffected. Full root-cause trace, dead ends already ruled out, and the migration plan to fix it properly (move to App Router) are in `docs/MIGRATION.md`, Stage 11 — **read that before re-investigating this from scratch or before re-enabling Turbopack**. This section can be deleted once the App Router migration lands and `pages/_document.tsx` is gone.
