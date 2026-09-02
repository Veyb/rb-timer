## Why

This project is about to go through further large-scale modernization/refactoring (following the Strapi/Next/pnpm upgrade already done, and further changes likely ahead). There is currently no automated way to know whether the app still starts and the core screens still render after a change — `pnpm test` is literally `eslint .` (a lint check, not a real test), and the only verification method used so far has been manual click-through or ad-hoc AI-driven browser sessions. This change adds a lightweight Playwright Test suite whose job is specifically to catch "it doesn't even start / a core screen crashes" regressions — not to provide deep feature coverage, which isn't the goal given how much the app's internals are expected to keep changing.

## What Changes

- Add `@playwright/test` as a `frontend` devDependency and a `playwright.config.ts` that:
  - Auto-starts both `backend` (`pnpm --dir backend dev`) and `frontend` (`pnpm --dir frontend dev`) via `webServer`, with `reuseExistingServer: !process.env.CI` — so a developer's own already-running dev servers (per the README's two-terminal workflow) are reused untouched, while CI (or a cold local run) gets both servers launched and torn down automatically. A failed `webServer` readiness check is itself the first, cheapest form of the "does it start" signal this change exists for.
  - Runs against the existing local `backend/.tmp/data.db` (the real migrated dataset — 109 users, 71 bosses) — see the Test Data Fixture decision in design.md for why, and how the suite avoids ever touching the 109 real migrated user accounts.
- A one-time, idempotent auth setup step (a Playwright "setup project") that logs in through the real login form as a dedicated fixture test account, registering it through the real registration form first if it doesn't exist yet, and upgrading its role to "Офицер" (the top role, needed to reach every gated screen) if it isn't already. Saves the resulting session as `storageState` for reuse by every other test file, so login happens once per test run, not once per test.
- Smoke-test coverage for the app's core screens/flows, read-only in intent (no assertions that mutate the real dataset via UI actions like toggling collection items or editing users): `/login`, `/register` (exercised for real by the setup step itself), `/` (boss list), `/profile/collections`, `/profile/management`, `/users`. Each check: page reaches a ready state, a key element/heading is visible, no uncaught console errors.
- New `pnpm test:e2e` (`playwright test`) and `pnpm test:e2e:ui` (`playwright test --ui`, for interactive manual runs) scripts in `frontend/package.json`. The existing `pnpm test` (currently `eslint .`) is left as-is — out of scope to redefine what "test" means project-wide in this change.

**Explicitly out of scope**: deep/strict feature coverage, testing individual bug fixes in detail, mutating test data (e.g. actually toggling a collection item and asserting persistence), CI workflow wiring (no `.github/workflows` exists in this repo yet — this change only makes the suite runnable, not automatically run). Any of these can be proposed later once the app's shape has settled down more.

## Capabilities

No product-facing capability or requirement changes — this is a testing-infrastructure change only. `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `frontend/package.json` — new `@playwright/test` devDependency, new `test:e2e` script.
- New files under `frontend/`: `playwright.config.ts`, an e2e test directory (setup project + smoke-test spec files).
- New file `backend/scripts/e2e-fixture-role.js` and a `backend/package.json` script (`e2e:fixture-role`) — uses backend's own already-installed `better-sqlite3` against `backend/.tmp/data.db` directly; invoked as a subprocess from the Playwright setup step. Kept on the backend side (not a new frontend dependency) so the native `better-sqlite3` module isn't installed a second time, and so this stays consistent with the README's stated backend/frontend independence.
- `backend/.tmp/data.db` gains one new row (the fixture test user, in the "Офицер" role) on first run in any given environment — never modifies or removes any of the 109 existing real user accounts.
- No change to `backend/` **application** code (the Strapi app itself) — only a standalone script invoked outside of Strapi's own request lifecycle, talking to the SQLite file directly, the same way this project's own prior Strapi 4→5 migration fixes (the `boss.world` NULL fix, the `_lnk` table `id` fix) already did.
- `.gitignore` — the fixture's `storageState` file (real session cookies) must never be committed.
