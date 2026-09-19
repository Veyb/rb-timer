## 1. The field, in the data

Nothing reads `subclass` yet after this group; the suite must stay green on the
old source.

- [x] 1.1 Add `subclass: boolean` to `RaidBossInfo` in `apps/backend/mocks/raid-bosses/types.ts`, directly after `epic`, and verify the interface still lists every field the two data files use
- [x] 1.2 Add `subclass` to all 158 entries of `apps/backend/mocks/raid-bosses/data-wiki.ts` — `true` for game ids `34141`, `34142`, `34143`, `34144`, `false` for the rest — and verify `grep -c 'subclass:'` returns 158 and `grep -c 'subclass: true'` returns 4
- [x] 1.3 Add `subclass` to all 153 entries of `apps/backend/mocks/raid-bosses/data.ts` — the same four game ids are present there too — and verify `grep -c 'subclass:'` returns 153 and `grep -c 'subclass: true'` returns 4
- [x] 1.4 Add `subclass: false` to all 5 entries of `apps/backend/mocks/raid-bosses/missing.ts` (none of the four is in it) and verify `grep -c 'subclass: false'` returns 5
- [x] 1.5 Run `pnpm --filter backend check` and verify biome accepts all four files, including the `maxSize` override the large ones need

## 2. The field, in the plumbing

- [x] 2.1 Add `"subclass": { "type": "boolean", "required": true, "default": false }` to `apps/backend/src/api/raid-boss/content-types/raid-boss/schema.json`, beside `epic`, then run `pnpm exec strapi ts:generate-types` — `types/generated/` is gitignored and `check-types` fails against the stale declarations until it is refreshed. Verified by the test harness booting a real Strapi and writing the attribute
- [x] 2.2 Carry `subclass` through `apps/backend/src/helpers/catalog-source.ts`: add it to `RawBoss`, to the exported `CatalogBoss`, and to the object pushed in the boss loop; verify `pnpm --filter backend check-types` passes
- [x] 2.3 Add `subclass: boss.subclass` to the boss payload in `apps/backend/src/helpers/catalog-seed.ts` and verify `pnpm --filter backend test` still passes — the seed tests slice the real source, so no fixture changes
- [x] 2.4 Verify against the old source that the field flows end to end: seed a scratch database and read a boss back. Done as a permanent test in `catalog-seed.test.ts` rather than a manual run — it flips the stored value and re-seeds, so it proves the payload carries the field instead of the schema default masking it

## 3. The field, at the edge

- [x] 3.1 Add `subclass: boolean` to `RaidBoss` in `apps/frontend/types/raid-boss.types.ts`, after `epic`, and verify `pnpm --filter frontend check-types` passes
- [x] 3.2 In `apps/frontend/components/raid-boss-list/raid-boss-list.component.tsx`, rename the `.epic` rule in `Holder` to a neutral shared class (it sets only `margin-left`) and apply it to the existing gold `epic` tag; verify no `className="epic"` reference remains and the frontend lints clean
- [x] 3.3 Render a `cyan` `subclass` tag beside `epic` in the name column, on the same condition style as `boss.epic`. Nothing in the database holds `subclass` true until the seed of group 7, so the visual check that exactly the four spirits carry the tag is task 7.6

## 4. The switch

- [x] 4.1 Point `SOURCE_RELATIVE` in `apps/backend/src/helpers/catalog-source.ts` at `data-wiki.ts` and verify `readCatalogSource()` returns 158 bosses, 896 items, 3611 drops, 451 icons and 66 locations
- [x] 4.2 Leave `COLLAPSED_LOCATIONS` and the placeholder-slug handling in place and verify they no longer fire: the new source carries neither `slug: 'x'` nor the two Russian location names
- [x] 4.3 The new source states `worldX`/`worldY` in the second source's map space, fractional for 156 of 158, where the content type declared `integer` — seeding failed validation on the first boss. Widen both to `decimal` in `raid-boss/schema.json`, regenerate the Strapi types, and verify `pnpm --filter backend test` passes whole. See design.md for what the field now measures

## 5. The tripwires

- [x] 5.1 Update the counts in `apps/backend/tests/catalog-source.test.ts` — bosses 153 → 158 (lines 20, 49, 50), items 737 → 896 (lines 21, 37), drops 2791 → 3611 (line 22), icons 359 → 451 (line 24), locations 64 → 66 (line 27) — and verify the file passes
- [x] 5.2 Rewrite the comment above the locations assertion (line 26): the new source carries 66 real slugs, so nothing is dropped and nothing is un-collapsed; say the reader's repair is now a guard that does not fire
- [x] 5.3 Change the fractional-chance probe at line 108 from `37.7861` to `38.7833` — the same drop, `Puma Skin Gaiters` — and verify it is found
- [x] 5.4 Add an invariant asserting that exactly the bosses with game ids `34141`, `34142`, `34143`, `34144` have `subclass` true and every other boss has it false, keyed on `gameId` and not on `name`; verify it fails if any one of the four is flipped
- [x] 5.5 Fix the stale count in the comment at `apps/backend/tests/catalog-seed.test.ts:6` ("rather than all 153 bosses") and verify `pnpm --filter backend test` passes whole

## 6. The prose

- [x] 6.1 Apply the four MODIFIED requirements from this change's spec delta to `openspec/specs/raid-boss-catalog/spec.md` and verify `openspec validate seed-from-refined-catalogue --strict` still passes
- [x] 6.2 Apply the two ADDED requirements from the delta to the same file and verify each has at least one scenario in `#### Scenario:` form
- [x] 6.3 Reword the count-bearing comments in `apps/frontend/lib/api/raid-boss.ts` (line 36 "153 of them, so two requests"; line 83 "all 153 at once ... about 450 KB") to describe the behaviour without a count, and verify the pagination logic itself is untouched
- [x] 6.4 Reword the "another 566 files" comment at `apps/backend/scripts/seed-catalog.js:13` the same way and verify the script still runs
- [x] 6.5 The helpers carry more count-bearing prose than this group first listed. Correct it in `catalog-source.ts` (the file header's path, size and defect list; 153 → 158 bosses; 120 → 122 weapon usages and 33 → 34 daggers; `Proof of Loyalty` 150 → 155 bosses; 737 → 896 names and slugs; 731/737 → 890/896) and in `catalog-seed.ts` (120 → 122 usages, 153 → 158 bosses, 737/359 → 896/451 items and icons, 5582 → 7222 label lookups); rewrite the grades-file rationale, which justified a separate file by `data.ts` being generated by `fetch.js` — no longer true of this source. Every replacement value measured through the real reader, not estimated

## 7. The seed run

- [x] 7.1 Back up the database before seeding — after this point the added records cannot be removed by reverting the change. `pg_dump --clean --if-exists --no-owner --no-privileges` into `apps/backend/backups/`, which `.gitignore`'s `*.sql` already covers. Verified by counting the rows inside the dump: 153 bosses, 737 items, 2791 drops, 64 locations, 567 files. Restore with `psql -d rb_timer -f <dump>`. Note that a restore does not remove the image files the seed writes to `public/uploads` (1802 before the run); they are simply left unreferenced
- [x] 7.2 Run `pnpm --filter backend seed:catalog` against the existing database and verify it completes without error
- [x] 7.3 Verify the counts landed: 158 raid bosses, 896 items, 3611 boss-drops, 66 locations, and that no boss, item or boss-and-item pair from before the run has disappeared
- [x] 7.4 Verify the corrections applied rather than being skipped: pick a boss whose level or world coordinates differ between the two sources and confirm the stored record shows the new values, and the same for a drop whose chance changed
- [x] 7.5 Run `pnpm --filter backend seed:catalog` a second time and verify every count is unchanged, confirming the switch left the catalogue idempotent
- [x] 7.6 Open the boss list in the frontend and verify the four elemental spirits carry the cyan `subclass` tag and that a boss with a previously truncated drop list now shows its full one
