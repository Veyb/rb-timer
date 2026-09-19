## Why

The catalogue is seeded from `apps/backend/mocks/raid-bosses/data.ts`, scraped
from a page that lists only a boss's twenty richest drops. For 96 of its 153
bosses that cap actually bit: the drop list in the database is not the boss's
drop list, it is the top of it. Levels and world coordinates carry the same
page's errors.

A second, more complete source has since been merged into `data-wiki.ts`
alongside it, deliberately left unused so that `data.ts` stayed as a working
fallback. Running the real reader against each file measures the difference:

```
                   data.ts    data-wiki.ts
  bosses               153             158
  items                737             896
  drops               2791            3611
  locations             64              66
  icons                359             451
  avatars               96              96
```

The new file is ready rather than promising. All nineteen invariants asserted
in `tests/catalog-source.test.ts` hold against it — slug uniqueness, derived
grades, drop chance bounds, the pair-appears-once rule, the same six items whose
grade cannot be settled — with one exception, and that exception is a hardcoded
sample value rather than a property: the test looks for the chance `37.7861`,
and in the new source that drop (`Puma Skin Gaiters`, from the same boss) reads
`38.7833`. Fractional precision itself survives in 133 rows.

Re-seeding over the existing database adds and updates but orphans nothing.
Measured against the current derived catalogue: 0 bosses, 0 items and 0
boss-and-item pairs disappear. That holds because the item names in the new
source were reconciled back to the names already in the database, so the slugs
the seed matches on did not move.

The change also carries a fact the catalogue currently cannot express. Four
bosses — game ids `34141`, `34142`, `34143` and `34144`, the elemental spirits —
are the ones a player kills to take a subclass. Nothing in a boss record says
so, and it is not derivable from level, race or grade.

## What Changes

- A boss gains `subclass`, a required boolean that is false for every boss but
  the four elemental spirits. It is added to the source type, to both data
  files, to the content type, through the reader and the seeder, and shown in
  the boss list as a tag beside `epic`.
- The seed reads `data-wiki.ts` instead of `data.ts`. `data.ts` is left in place
  and kept valid — it keeps `subclass` too — so that reverting the switch stays
  a one-line edit.
- The counts asserted in `tests/catalog-source.test.ts` move to the new source's
  numbers, and the `37.7861` probe moves to `38.7833`. They stay hardcoded on
  purpose: a count that changes is a source that changed, and that is worth
  stopping for.
- Two defects `catalog-source.ts` repairs on the way in — the placeholder
  location slug and the two places collapsed under it — are absent from the new
  source, so the repair becomes a guard that no longer fires. It is kept: it
  costs nothing and it is what makes the switch safe to revert.
- Counts written into prose go out with the data behind them. Where a spec
  sentence or a comment states a number that this change invalidates, the
  sentence is reworded to say the thing without the count rather than restated
  with a new one.

## Capabilities

### New Capabilities

None. The catalogue capability already exists and this change extends it.

### Modified Capabilities

- `raid-boss-catalog`: a boss carries whether it grants a subclass, and the
  requirement text stops pinning behaviour to record counts.

## Impact

- Affected specs: `raid-boss-catalog` (modified)
- Affected code: `apps/backend/mocks/raid-bosses/{types,data,data-wiki,missing}.ts`,
  `apps/backend/src/api/raid-boss/content-types/raid-boss/schema.json`,
  `apps/backend/src/helpers/{catalog-source,catalog-seed}.ts`,
  `apps/frontend/types/raid-boss.types.ts`,
  `apps/frontend/components/raid-boss-list/raid-boss-list.component.tsx`
- Affected tests: `apps/backend/tests/catalog-source.test.ts` (counts, the
  chance probe, a new invariant for the four subclass bosses);
  `apps/backend/tests/catalog-seed.test.ts` reads a slice of the real source and
  needs no fixture change, only a stale count in a comment
- Affected database: adding `subclass` is a column with a default, so existing
  rows take `false` and the seed then sets the four. The source switch writes
  5 new bosses, 159 new items, 820 new drops and 111 newly referenced icons, and
  repoints the icon of 30 items that shared a generic file
- Not affected: no record is deleted. 19 icon files stop being referenced by any
  item and stay in the media library, which is the seed's existing behaviour and
  is left as it is
- Not affected: the frontend's catalogue queries. They restrict `fields` only on
  drops, so a new scalar boss attribute reaches the client without a query
  change, and the boss list already pages through the collection
