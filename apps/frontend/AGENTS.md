<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Never import antd's `theme` (or other non-component exports) into a Server Component

Importing `{ theme }` from `'antd'` directly at the top of a Server Component file (e.g. `app/**/*.tsx` without `'use client'`) silently yields `{}` — `theme.darkAlgorithm` etc. come back `undefined`, with no error, no warning. antd's `theme` submodule transitively touches code marked `'use client'`; the RSC bundler can generate a client reference for actual components re-exported from a client-tainted module, but not for plain data/function exports like `darkAlgorithm`. Same applies to any other package with the same shape (a client-tainted module barrel-exporting plain values alongside components). Fix/pattern used throughout this app: wrap the usage in its own small `'use client'` component (see `app/antd-theme-provider.tsx`) and compose that into the Server Component tree instead of importing the raw value directly. Full incident writeup, plus the (now resolved) Turbopack + Pages Router CSS-in-JS bug that prompted the App Router migration in the first place, is in `docs/MIGRATION.md`, Stage 11.
