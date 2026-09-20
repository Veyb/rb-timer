## Why

Every version of the catalogue so far has been built from someone else's copy of
the game's data. The game's own reference is now reachable, and comparing it
against what we ship shows the copies have drifted.

Measured against `data-wiki.ts`, boss for boss:

```
  bosses                    158 vs 158, no difference
  epic / subclass flags     no difference
  levels                    3 wrong — the epics
  item names                78 names missing the "Unidentified " prefix, 207 rows
  drop rows only on ours    137 — a drop table the server has since reworked
  drop rows only on theirs  287
  icon keys                 33 wrong
```

The levels are wrong in a way worth spelling out, because it is also a trap for
whoever writes the fetcher. The reference publishes a shared article whose stat
tables and level badges belong to a **different server** than the one the page
is filed under. Queen Ant reads level 75 with 24,462,500 HP there, and level 56
with 10,176,400 HP on its own page for our server. Only the drop tables are
split per server, and even then the other server's table comes first.

The source is also alive. Its own article says the drop was "updated and
reworked", and we can see where: one boss lost its whole shield-and-helmet line,
eight rows, while we still list them. A catalogue refreshed by hand once will be
wrong again by the next patch, so this change is as much about the mechanism as
about the data.

Two further findings shape the design rather than the motivation. What the
catalogue stores as `worldX`/`worldY` is not a world coordinate at all — it is
the position of the boss's pin on the reference's own map, which we can confirm
exactly: the stored `1557.91 / 2527.95` for Queen Ant is that pin's `left` and
`top`. And the strengths and weaknesses a player needs are not per-boss data:
they come from a shared vocabulary of skills, twenty-one rows of which describe
every boss in the game.

## What Changes

- Three refresh scripts, each a superset of the one before, so a routine refresh
  costs one request and a deep one is opt-in:
  - **drops** — one request. Drop lists, item grades, drop grouping, the boss
    roster, the epic and subclass flags.
  - **profile** — adds one request per boss. Level, race, the full statistics
    including accuracy and evasion, respawn, soul-crystal level, and the skills
    the boss carries. Locations are not refreshed — the source transliterates
    them and the catalogue's own are correct — except for a boss the catalogue
    does not yet hold, whose location is taken and reported.
  - **map** — adds one request per boss for the pin coordinates.
- **BREAKING** — `worldX`/`worldY` become `wikiX`/`wikiY`. They are renamed
  rather than repurposed because they never held what their names claimed. Real
  world coordinates, if a source for them ever appears, arrive as new fields.
- **BREAKING** — a boss's weapon affinities stop being two lists of weapon-type
  records and become the skills it carries. A skill is a catalogue record with a
  name, a level, an icon and its modifiers; the modifiers say which weapons,
  elements and statistics it shifts, and by how much. The `weapon-type`
  collection is removed.
- **BREAKING** — item names adopt the source's spelling, which adds the
  `Unidentified ` prefix to 78 of them. Because a slug is derived from a name,
  this creates new item records and strands the old ones.
- An icon the catalogue names but does not hold is fetched from the source and
  converted, for items and for skills alike. The source serves them, so a named
  icon with no file behind it is a gap the refresh can close itself rather than
  a note for somebody to act on later — and it has to, because the seed uploads
  by path and fails on a missing one.
- A `prune` step removes what the source no longer lists: drops first, then
  items no drop points at. It refuses to run against a source that failed to
  load, and reports before it deletes.
- The other server's drop tables are kept in a file of their own rather than
  discarded. They cost nothing to parse — they are on the same page — and a
  per-server catalogue is a plausible future.
- Boss levels and statistics are taken from the per-boss page for our server,
  never from the shared article.

## Capabilities

### New Capabilities

None. This extends the existing catalogue capability.

### Modified Capabilities

- `raid-boss-catalog`: a boss's affinities come from skills rather than from
  weapon-type relations; the map position is named for what it is; the catalogue
  states where each field comes from and what a refresh may overwrite; records
  the source has dropped can be removed.

## Impact

- Affected specs: `raid-boss-catalog` (modified)
- Affected code: new fetch and refresh scripts under `apps/backend/scripts/`;
  `apps/backend/mocks/raid-bosses/{types,data-wiki}.ts` and a new
  `data-wiki-gamma.ts`; `apps/backend/src/helpers/{catalog-source,catalog-seed}.ts`;
  a new `skill` content type with modifier components; the `weapon-type` content
  type and the `resistances`/`vulnerabilities` relations are removed;
  `apps/frontend/types/raid-boss.types.ts` and the boss list, which reads those
  relations today
- Affected tests: `catalog-source.test.ts` counts and its weapon-vocabulary
  invariant; `catalog-seed.test.ts` where it asserts weapon-type records
- Affected database: renaming items creates new records and leaves the old ones
  without drops, which is what `prune` is for. Removing `weapon-type` drops six
  records and two join tables
- Not affected: the seed stays additive. Deletion is a separate, explicit step
  that never runs as part of seeding
- Not affected: avatars, dungeon plans and the hand-assembled world map image.
  The reference carries none of them, so a refresh must leave them alone
- Added: the reference's own world map, which `wikiX`/`wikiY` are pixels of. The
  catalogue held the coordinates and not the picture they are measured on
