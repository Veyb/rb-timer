## Why

The database carries an item catalogue built for a feature that has already been
withdrawn: `profile-navigation` took the collection section out of navigation and
kept only its route alive so old links would not break. What remains is
`Collection` (292 rows), `Item` (346), `Effect` (200) and 424 media records
backed by 849 PNG files uploaded years ago — none of it reachable from the
product, all of it in every backup.

Meanwhile the data the product actually wants exists only as a frontend mock.
`apps/frontend/mocks/raid-bosses/data.ts` holds a scraped raid-boss reference —
153 bosses, 63 locations, 737 distinct drop items, 2791 boss-to-item drop rows,
and 5.3 MB of webp imagery under `mocks/raid-bosses/images/`. It is a 795 KB
TypeScript literal that only the frontend bundle can read: nothing can query it,
nobody can correct it, and it ships to the browser whole.

The intended product is a page any visitor can open — signed in or not — showing
the boss list with full detail and, later, a map with location markers. That
rules out both the mock (not queryable) and the current data model (nothing to
query). It also sits outside the community gate: this is global game reference
data, not one guild's records.

The `Boss` collection type is deliberately untouched. Despite the name it is not
a catalogue but the live respawn timer — `updateBossTime()` in
`apps/frontend/lib/api/boss.ts` writes `time` and `restarted` to it, and its 34
published rows carry Russian names with no reliable join to the 153 English-named
bosses in the mock. Reworking the timer onto the new catalogue is a later change;
this one marks `Boss` deprecated and leaves it running.

## What Changes

- **BREAKING** — `Collection`, `Item` and `Effect` collection types and the
  `collection.item` component are removed, along with their media. The
  `/profile/collections` route and the `collections-block` component tree go
  with them; `profile-navigation` currently guarantees that route keeps
  resolving, and that guarantee is withdrawn.
- **BREAKING** — the `collections` attribute on `User` is removed with the
  feature that wrote it. It is a `json` map of which collection items a user
  had gathered, non-empty for 63 of 114 accounts, and meaningless once the
  collections it keys are gone. `user-account-updates` names it in the
  allowlist of self-assignable profile attributes, so a request body carrying
  `collections` stops being accepted and starts being rejected as an unknown
  attribute.
- New reference model, seeded from the mock: `RaidBoss` (153), `Location` (64),
  `Item` (737, a new catalogue type reusing the freed name), `BossDrop` (2791),
  `Grade` (6) and `Avatar` (96).
- `Grade` is a collection type rather than an enumeration on each of `RaidBoss`
  and `Item`. Two enumerations would need editing in two places to extend, and
  Strapi sorts an enumeration as a string — `sort=grade` would order
  `A, B, C, D, NG, S`. A `Grade` record carries an explicit `order`, so
  `sort=grade.order` yields `NG, D, C, B, A, S`.
- Respawn information is modelled for both kinds the source contains: an
  interval (8 distinct variants across 150 bosses, all whole hours, stored as
  minutes) and a weekly schedule (the 3 epic bosses, which the source records
  only as the literal string `Fixed` — the shape is defined, the entries are
  authored later).
- Boss avatars, item icons, dungeon plans and the world map are uploaded to the
  Media Library and related to their records. Sharing is expected and native:
  96 avatars serve 153 bosses, 359 icons serve 737 items, and Strapi's
  `files_related_mph` morph table already carries one file against 16 records in
  this database.
- Two seed scripts: one that loads the catalogue into an empty database and is
  idempotent on re-run, and one that exports the current database state back to
  the seed source, so hand-made corrections (grades above all) survive the next
  seed instead of living only in one developer's database.
- Public read access for the catalogue, granted to the unauthenticated role, and
  a schematic list route on the frontend that proves an anonymous request
  reaches it end to end.
- Every catalogue record names itself in the admin panel. Strapi picks the first
  attribute of type `string` and falls back to the record id, which left avatars
  and drops showing a cuid and bosses showing their game id — a relation picker
  nobody could use. Fixed by declaring the display field in each schema and by
  giving a drop a label naming the boss and item it joins.

Non-goals, deferred to their own changes: reworking the respawn timer onto this
catalogue; promoting `Community.server` from an enumeration to a `Server`
collection type with a timezone, which per-server respawn schedules will need;
rendering the map and its markers; and any per-community overlay on catalogue
data.

## Capabilities

### New Capabilities

- `raid-boss-catalog`: the raid-boss reference data — what a boss, location,
  item, drop and grade record hold, how they are identified and addressed by
  slug, how their imagery is stored, that the catalogue is readable without
  authentication, and that it is present from initialisation.

### Modified Capabilities

- `community-membership-gate`: the gate is defined over "functional screens …
  built on a community's data". The catalogue is global reference data and must
  be reachable by visitors who are not signed in at all, so the requirement has
  to name reference screens as outside the gate, as it already does for the
  profile area.
- `profile-navigation`: the requirement that the withdrawn item-collection route
  "SHALL remain functional for the moment" is replaced by its removal.
- `user-account-updates`: `collections` leaves the allowlist of self-assignable
  profile attributes, and the scenario asserting that collections tracking keeps
  working goes with the attribute. The privileged-attribute requirement is
  untouched.

## Impact

- **Backend**: `apps/backend/src/api/{collection,item,effect}` removed;
  `src/components/collection/item.json` removed. New API directories and
  components under `src/api` and `src/components`. Content API permissions for
  the public role. Their tables go on their own — `forceMigration` defaults to
  `true`, so the schema diff drops tables for removed content types — but media
  does not: the 424 `files` rows, the 849 files under `public/uploads` and the
  morph rows that pointed at the removed records need an explicit cleanup step.
- **User model**: the `collections` attribute leaves
  `src/extensions/users-permissions/content-types/user/schema.json` and the
  `profileAttributes` allowlist in `strapi-server.ts`, and the test covering it
  in `tests/user-account-updates.test.ts` goes with it. The data is
  irrecoverable once the attribute is dropped — the backup taken before the
  change is the only copy.
- **Frontend**: `components/collections-block/**`,
  `contexts/collection-context/**`, `lib/api/collection.ts`, the collection
  entries in `lib/api/index.ts`, `app/profile/[type]` handling of the
  collections section, the `Collection`/`Effect`/`UserCollections` types, the
  `profileCollections` test ids and `e2e/profile-collections.spec.ts`. New
  catalogue API client and list route.
- **Data**: `public/uploads` purged and repopulated with ~566 assets; the mock
  `data.ts` becomes the seed's input rather than a runtime import.
- **Deprecated, not changed**: the `Boss` collection type and every path that
  reads or writes it.
