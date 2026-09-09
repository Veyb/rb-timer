# @rb-timer/typescript-config

The TypeScript settings the two applications share. Three presets, each
extending the upstream one for its runtime and then overriding as little as
possible:

| Preset               | Extends                                    | Used by        |
| -------------------- | ------------------------------------------ | -------------- |
| `base.json`          | nothing                                    | the two below  |
| `nextjs.json`        | `next/tsconfig.json`                       | `apps/frontend`|
| `strapi-server.json` | `@strapi/typescript-utils/tsconfigs/server`| `apps/backend` |

These files are strict JSON, not JSONC. An editor accepts comments in a file
named `tsconfig*.json` and rejects them here, even though `tsc` itself would
read them — so anything worth explaining is explained below rather than inline.

## Why `strapi-server.json` overrides `module` and `moduleResolution`

Strapi's own server preset still sets `moduleResolution: "Node"` — the node10
algorithm, which TypeScript has deprecated and removes in 7.0. An editor
running a newer compiler than the workspace reports it as an error while
`tsc` at 5.9 says nothing, so the warning shows up with no way to reproduce it
from the command line.

`node16` is the modern equivalent for a CommonJS server, and TypeScript refuses
it unless `module` matches. Nothing about the output changes: `apps/backend`
has no `"type"` field in its `package.json`, so every file is still emitted as
CommonJS. Checked by building and reading `dist/` — `require` and
`exports.__esModule`, exactly as before — and by running the backend suite, the
PostgreSQL suite, a full `strapi build` including the admin panel, and the
Playwright suite against a booted dev server.

## Why `strict` is off for the backend

Inherited from the state the backend was converted to TypeScript in, not a
decision worth defending. Turning it on is its own piece of work.
