## 1. Safety net

- [x] 1.1 Dump the database and archive `apps/backend/public/uploads` to a
  restorable location; verify by listing the dump size and the archived file
  count, and record both in the change notes. Steps 3 and 4 are irreversible
  without this.
- [x] 1.2 Record the pre-change baseline — row counts for `bosses`, `items`,
  `collections`, `effects`, `files` and the `public/uploads` file count — so the
  cleanup in step 3 can be checked against it.

## 2. Withdraw the collection feature from the frontend

- [x] 2.1 Delete `apps/frontend/components/collections-block/**` and its barrel
  exports; verify `pnpm --filter frontend check-types` reports no unresolved
  imports.
- [x] 2.2 Delete `apps/frontend/lib/api/collection.ts` and its re-exports from
  `lib/api/index.ts`; verify `pnpm --filter frontend check-types` passes.
- [x] 2.3 Remove the collections section from `app/profile/[type]/page.tsx` and
  `app/users/[userId]/[type]/page.tsx`, and drop the `Collection`/`Effect`
  entries from `apps/frontend/types`; verify `/profile/collections` returns the
  not-found response and `/profile/management` still renders.
- [x] 2.4 Delete `apps/frontend/e2e/profile-collections.spec.ts`, the
  `profileCollections` entries in `constants/test-ids.ts`, and the
  `UserCollections` type together with `User.collections` in
  `types/user.types.ts`; verify `pnpm --filter frontend check-types` passes and
  no `profileCollections` reference remains.
- [x] 2.5 Run `pnpm --filter frontend check` and `pnpm --filter frontend test:e2e`;
  verify both pass with no reference to the removed module remaining.

## 3. Purge the old media

- [x] 3.1 Write a one-off cleanup script under `apps/backend/scripts/` that
  collects `files` rows related to `api::collection.collection`,
  `api::item.item` and `api::effect.effect` through `files_related_mph`, plus
  the rows attached to nothing at all — the join reaches only 133 of the 424,
  the other 291 being orphans of the same February 2022 upload batch whose
  records were deleted over the years — and the two unrecorded logo files on
  disk, sparing dotfiles so `.gitkeep` survives; verify it prints the set
  without deleting in dry-run mode and that the count matches the 424-row
  baseline from 1.2.
- [x] 3.2 Run the cleanup for real — morph rows, then `files` rows, then the
  files on disk; verify `files` and `files_related_mph` reach zero, that
  `public/uploads` holds nothing but `.gitkeep`, that media belonging to any
  other content type is untouched, and that a second run reports nothing to do.

## 4. Remove the superseded content types

- [x] 4.1 Delete `apps/backend/src/api/{collection,item,effect}` and
  `src/components/collection/item.json`; verify `pnpm --filter backend dev`
  boots and the admin panel no longer lists them.
- [x] 4.2 Remove the `collections` attribute from the user schema extension and
  from the `profileAttributes` allowlist in
  `src/extensions/users-permissions/strapi-server.ts`, and replace the test in
  `tests/user-account-updates.test.ts` that asserted collections tracking works
  with one asserting the attribute is now rejected; verify
  `pnpm --filter backend test` passes and `up_users` no longer has the column.
- [x] 4.3 Confirm the schema diff dropped `collections`, `items`, `effects`,
  `components_collection_items` and their link tables; verify with `\dt` that
  none remain, and drop by hand only what survived.

## 5. Catalogue content types and components

- [x] 5.1 Add the `Grade` collection type (`code` uid, `label`, `order`
  integer), `draftAndPublish: false`; verify the admin panel accepts a record
  and rejects a duplicate `code`.
- [x] 5.2 Add the shared components — respawn, weekly schedule entry, boss
  stats, weapon affinity, element modifier, stat modifier, dungeon — with the
  enumerations in lower case as the spec names them; verify
  `pnpm --filter backend check-types` passes after Strapi regenerates
  `types/generated`.
- [x] 5.3 Add the `Location` collection type (`slug` uid, `name`, optional
  dungeon component) and `Avatar` (`slug` uid, `full` and `mini` media),
  `draftAndPublish: false`; verify a location saves and reads back. Avatar
  sharing needs uploaded media to exercise at all, so it is verified where it
  actually happens — in 7.3, where 96 avatars serve 153 bosses.
- [x] 5.4 Add the `Item` collection type (`slug` uid, `name` unique, `grade`
  relation, `icon` media), `draftAndPublish: false`; verify a record saves with
  an icon shared with another item.
- [x] 5.5 Add the `RaidBoss` collection type — `slug` uid, `gameId` unique,
  `name`, `race` enumeration, `level`, `epic`, map and world coordinates,
  `saMaxLevel`, the respawn and stats components, the affinity and modifier
  lists, and relations to `Location`, `Avatar` and `Grade` — with
  `draftAndPublish: false`; verify a record saves and reads back with every
  relation populated.
- [x] 5.6 Add the `BossDrop` collection type (relations to `RaidBoss` and
  `Item`, `chance` as a `float` — Strapi's `decimal` is `numeric(10,2)` and
  would round the fourth decimal away — `minCount`, `maxCount`), plus a
  lifecycle refusing a second drop for a pair that already has one, since
  neither Strapi nor the link tables can express that constraint;
  `draftAndPublish: false`. Verify a chance of `37.7861` round-trips unrounded
  and that the duplicate pair is refused.
- [x] 5.7 Mark the existing `Boss` type deprecated in its `info.description`
  only; verify no attribute, controller, route or service of it changed by
  diffing `src/api/boss`.

## 6. Public read access

- [x] 6.1 Grant `find` and `findOne` on the six catalogue types to the public
  role, and confirm no role holds create, update or delete; verify with
  `curl` carrying no credentials that a read returns 200 and a write returns
  403.

## 7. Seed

- [x] 7.1 Write the source reader that loads `apps/frontend/mocks/raid-bosses/data.ts`
  and normalises it: item identity by name, `itemId` kept only as the icon
  lookup key, the two `x` locations split into Eastern Border Outpost and
  Lachik Habitat; verify it reports 153 bosses, 64 locations — 63 slugs in
  the source, less `x`, plus the two it hid — 737 items, 2791
  drops, 96 avatars and 359 icons.
- [x] 7.2 Write the idempotent media upload step that looks a file up by name
  before uploading; verify a first run uploads 567 assets — 359 icons, 96 full and 96
  mini avatars, 15 dungeon plans and the world map, named by their path below
  `images/` since the two halves of an avatar share a filename — and a second
  uploads none, with `select count(*) from files` unchanged between them.
- [x] 7.3 Write the record seed in dependency order — grades, locations,
  avatars, items, bosses, drops — setting every `uid` explicitly, since
  auto-generation is admin-only; verify the expected row counts and that no
  catalogue record has an empty slug.
- [x] 7.4 Make the seed idempotent by matching on the stable keys (`code`,
  `slug`, `gameId`, boss-and-item pair); verify a second run leaves every row
  count unchanged and every slug identical.
- [x] 7.5 Add the seed to `apps/backend/package.json` scripts and document the
  command; verify a fresh database reaches a fully populated catalogue from that
  one command.
- [x] 7.6 Cover the seed with tests under the backend's existing vitest setup —
  normalisation, idempotency, the split locations, decimal precision; verify
  `pnpm --filter backend test` passes.

## 8. Export

- [x] 8.1 Write the export script that writes the grades now in the database to
  `src/helpers/catalog-grades.json`, which the seed reads — not into `data.ts`,
  which is generated by `fetch.js`, says so on its first line, and has no grade
  field to write into. Only grades off the default are listed. Verify that
  setting a boss's grade, exporting, resetting the database to `NG` and
  re-seeding reproduces that grade.
- [x] 8.2 Add the export to `apps/backend/package.json` scripts and document
  when to run it; verify the file it writes lists only what somebody changed
  rather than dumping all 890 records.
- [x] 8.3 Compare against the derived grade rather than `NG`, which stopped
  meaning "nobody has set this" the moment grades became derived — the old test
  would have written some 884 entries restating the rules and pinned every
  record against a later change to them. Let the export be pointed at another
  file so the suite cannot rewrite the real one. Verify it writes nothing when
  every grade matches the rules, and exactly one entry when one record is set
  against them.

## 9. Frontend catalogue route

- [x] 9.1 Add the catalogue API client — list and by-slug reads, no
  authorisation header; verify a request from a signed-out browser succeeds.
- [x] 9.2 Add the schematic list route at `/raid-bosses`, rendering name, level,
  grade, location and avatar, and open that prefix in `proxy.ts` — which
  otherwise redirects every path without a session to `/login`, catalogue
  included. Verify it renders for a visitor with no session and that `/` still
  redirects for the same visitor.
- [x] 9.3 Add an e2e test asserting the catalogue route renders without
  authentication; verify `pnpm --filter frontend test:e2e` passes.
- [x] 9.4 Show a boss's drops — grade, icon, name, count and chance — while the
  pointer rests on its row, fetching them per boss on open and caching the
  answer; verify the tooltip fills with data for an anonymous visitor and sits
  wholly inside the viewport.

## 11. Make the catalogue administrable

- [x] 11.1 Add a `label` string to `BossDrop`, first in its schema, and have the
  lifecycle fill it with the boss and item names on create and whenever either
  relation changes; verify a drop created from the admin panel gets a label and
  that changing its item rewrites it.
- [x] 11.2 Have the seed set the label itself rather than leaving it to the
  lifecycle, since it writes 2791 of them and already holds both names; verify a
  seeded drop's label matches its boss and item.
- [x] 11.3 Declare the display fields in the schemas — `config.settings.mainField`
  for a type's own list, `config.metadatas.<relation>.edit.mainField` for each
  relation pointing at it, since Strapi computes the latter from the target's
  structure and not from the target's own setting. `settings` must carry
  `bulkable`, `filterable`, `searchable` and `pageSize` too — the validator
  marks them required and refuses to boot on a partial object — and every
  metadata entry needs both `edit` and `list`. Verify no catalogue relation
  picker shows a cuid or a game id.
- [x] 11.4 Clear the stored view configuration for the catalogue types once, on
  this database only: a stored configuration wins over the schema's, so the
  declarations in 11.3 reach a fresh clone but not a database that has already
  saved one. Verify the regenerated configuration matches what the schemas
  declare.

- [x] 11.5 Add a `hasDungeon` boolean to `Location`, not editable by hand, and
  have a lifecycle set it from the presence of the dungeon component on create
  and update; a single component renders as a dash in the list whatever it
  holds, because Strapi gives a component no `mainField` and then tests an
  object for `length`. Verify the list tells the 15 locations with a plan from
  the 49 without, that it can be filtered on, and that removing a plan clears
  the flag. Declare the list layout too: a new attribute is not added to a
  stored one, and the `dungeon` column it replaces is dropped, since that column
  can only ever be a dash.

- [x] 11.6 Guard and maintain drops from the boss end as well: a drop attached
  through a boss's relation field is a write to the boss, so `boss-drop`'s own
  lifecycle sees no `raidBoss` — measured, such a drop got `label = null` and
  bypassed the pair check entirely. Add a `raid-boss` lifecycle that refuses a
  duplicate pair before the write and writes the labels after it, covering a
  rename too, and share the relation-input helpers between the two lifecycles.
  Verify by attaching a drop from inside a boss, by attaching a clashing one,
  and by renaming a boss.
- [x] 11.7 Make the drop list worth reading: `label` not editable since it is
  derived, columns `label, chance, minCount, maxCount` rather than the boss and
  item the label already names, 50 rows a page instead of 10 for 2791 records,
  sorted by label. Clear only the stored `boss-drop` configuration, leaving any
  view the operator has configured on other types alone.

- [x] 11.8 Mark both of a drop's relations `required` for the admin form, and
  enforce the item in the lifecycle — `required` on a relation is not validated
  by the Document Service, which was measured by creating a drop with neither
  while both were marked required. Leave the boss unenforced at create, since a
  drop made from inside a boss has none yet. Verify all three cases.

- [x] 11.9 Replace the `weapon-affinity` component with a `WeaponType`
  collection the boss points at through two many-to-many relations, so the panel
  shows named chips instead of blank accordions and the label is stored once
  rather than beside each of the 120 usages. Seed the six types, grant public
  read, update the frontend types, and delete the component. Verify the 120
  links survive the move, that a boss reads back with labels, and that filtering
  by weapon code still works.

## 10. Close out

- [x] 10.1 Derive the grades instead of setting 890 of them by hand: a boss's
  from its level in the operator's bands, an item's from the bosses that drop it
  where they agree. Verify the bosses land 49 `D` / 35 `C` / 25 `B` / 44 `A`,
  that an item takes the grade it names where it names one and otherwise its
  bosses' when they agree — 731 of 737 — and that the six neither rule reaches
  keep the default and are reported by name. Verify the two item rules never
  disagree, and that a hand-set grade still wins over both.
- [x] 10.5 Review the derived grades, correct whatever disagrees — the six
  undecidable items above all — run the export, and commit the result; verify a
  fresh seed reproduces the corrections. Reviewed: nothing disagrees. The six
  keep `NG` by decision rather than by default, being quest and skill items
  whose grade is absent rather than unknown, so the export writes an empty file
  and the seed reproduces the catalogue unchanged.
- [x] 10.2 Run `pnpm check-types`, `pnpm check` and `pnpm test` at the repo root
  plus the frontend e2e suite; verify all pass.
- [x] 10.3 Verify the whole flow against a running stack: seed an empty
  database, open the catalogue route signed out, and confirm the boss timer
  still works for a signed-in member.
- [x] 10.4 Record the two items left open — the epic bosses' weekly schedule
  entries, which the source does not contain and which are seeded empty, and the
  `Server`/timezone question from design.md — as follow-up work rather than
  leaving them implicit.
