## Context

See proposal.md — Why, for the motivation and the measured difference between
the two sources.

What matters for the approach is the shape of the pipeline. The catalogue is a
TypeScript literal on disk that `catalog-source.ts` reads **as text**, evaluates
in a `vm` context and normalises into a derived catalogue; `catalog-seed.ts`
walks that and upserts each subject. Nothing `import`s the data files, and
`apps/backend/tsconfig.json` excludes `mocks/` so they are never compiled.

```
  mocks/raid-bosses/data-wiki.ts        the literal
        |  read as text, vm-evaluated
        v
  catalog-source.ts     RAID_BOSSES -> CatalogBoss[] / CatalogItem[] / CatalogDrop[]
        |                             + derived grade, slug, icon map
        v
  catalog-seed.ts       upsert(uid, where, data) per subject
        |                 findOne(where) -> update(documentId) : create()
        v
  Strapi documents      raid-boss / item / boss-drop / location / avatar
```

Three properties of that pipeline drive every decision below:

1. **The upsert is keyed on a derived identifier.** A boss matches on `slug`, an
   item on `slug` (derived from its name), a drop on the `(raidBoss, item)`
   pair. Change a name and you do not rename a record, you create a second one.
2. **`update()` is a merge, not a replace.** Fields present in the payload
   overwrite; fields absent are left alone. The boss payload names `level`,
   `worldX`, `worldY` and the drop payload names `chance`, `minCount`,
   `maxCount` unconditionally, so corrected values do land.
3. **Nothing is ever deleted.** There is no reconciliation pass. A subject the
   source stops mentioning keeps its record, and an image nothing points at
   keeps its file.

## Goals / Non-Goals

Goals:

- The seeded catalogue is the complete one: full drop lists rather than each
  boss's twenty richest.
- A boss can state that killing it grants a subclass.
- The switch is a one-line revert for as long as `data.ts` is kept.
- Every step of the sequence leaves the test suite green, so a half-applied
  change is still a working tree.

Non-Goals:

- Deleting, rewriting or regenerating `data.ts`. It stays, valid and unused.
- Building a reconciliation or delete pass into the seed. The catalogue only
  ever grows; pruning is a separate problem with its own risks.
- Cleaning the media library of icons nothing references.
- Any change to how grades, slugs, respawns or imagery are derived. This change
  swaps the input and adds one field; the rules are untouched.

## Decisions

### `subclass` is required, not optional

`subclass?: boolean` would have touched four lines in `data-wiki.ts` instead of
158, and would have left `data.ts` untouched entirely.

Chosen against it because an optional boolean makes "does not grant a subclass"
and "nobody has said yet" the same value, and the catalogue already has a field
of exactly this shape — `epic` — that is required and explicit on every entry.
Matching it keeps one rule instead of two.

The cost is that `data.ts` has to gain the field too. That is cheap (149 ×
`false`, 4 × `true`) and is what keeps it a *valid* fallback rather than a file
that merely still exists. `fetch.js`, which regenerates `data.ts` from the
original page, will emit entries without the field — acceptable, because that
script is already producing the source this change is moving away from.

### The four bosses are identified by game id

`34141`, `34142`, `34143`, `34144` — not by the names `Kaldrak, Fire Spirit` and
so on.

The name is the least stable thing about these records: it is what the two
sources disagreed about most, it carries the source's spelling, and it is a
candidate for translation. The game id is the game's own identifier, is already
what `slug` is built from, and is the one field the merge of the two sources
never had to reconcile. The spec and the test both anchor on it.

### The source is switched by editing the constant

Alternative considered: an environment variable selecting the source file, so
that both could be exercised without a code edit.

Rejected. The codebase has no hidden switches of that kind, and an env-selected
data source means the answer to "what is in the database" depends on how the
seed was invoked rather than on what is in the repository. The revert is one
line either way; a variable only makes it a line somebody can forget they set.

`SOURCE_RELATIVE` doubles as the landmark `findRepoRoot()` walks up to find, so
it must name a file that exists at that path — `data-wiki.ts` sits beside
`data.ts`, so the walk is unaffected.

### The test keeps hardcoded counts

`expect(source.bosses).toHaveLength(158)` and its eight siblings could have been
loosened to ranges or to structural assertions.

Kept hard, and updated to the new numbers. These assertions are not testing the
reader, they are a tripwire on the data: a count that moves means the source
moved, and that is worth stopping a build for. The file already takes this
stance elsewhere — "A seventh name appearing here is a decision to make and not
a count to update".

The one assertion that is not a count is treated the same way: the probe for
chance `37.7861` becomes `38.7833`, the same drop (`Puma Skin Gaiters`) as the
new source states it. Restructuring it into "some chance has four decimals"
would have made it survive any future source, and would have stopped telling us
which source we are looking at.

### `COLLAPSED_LOCATIONS` stays although it can no longer fire

The new source carries neither the placeholder slug nor the two collapsed
Russian names; both were repaired in the data. The reader's repair therefore
becomes unreachable code against `data-wiki.ts`.

Kept anyway. It is what makes reverting to `data.ts` a one-line edit rather than
a one-line edit plus restoring a deleted branch, and it costs two map lookups
per boss. Its test-file comment, which explains the repair as something that
happens, is reworded to explain it as a guard.

### `worldX`/`worldY` become decimals, and change what they measure

Found while implementing, not while planning. The two sources put different
quantities under these names:

```
                 worldX range            worldY range           fractional
  data.ts        -94093 .. 193904        -219639 .. 258225      0 of 153
  data-wiki.ts     1148 ..   2775           261 ..   2961     156 of 158
```

`data.ts` carries the game's own world coordinates. `data-wiki.ts` carries the
second source's map-space values, which are a linear rescaling of `mapX`/`mapY`
— `mapX = 1.329794·worldX − 1248.6875` fits them to within 0.12 px. Both files
agree on `mapX`/`mapY` for all 153 shared bosses and disagree on
`worldX`/`worldY` for all 153.

The content type declared both `integer`, so seeding the new source failed
validation outright. Two ways out were weighed: restore the game coordinates
(exact for the 153 from `data.ts`, derived for the 5 new ones by inverting
`mapX = 0.00751297·worldX + 985.3687`, which fits `data.ts` at R² = 0.9999999971
and ±0.056 px), or accept the new source's values and widen the column.

**Decided: widen the column to `decimal`.** The consequence is recorded rather
than argued: the stored coordinates become the second source's map-space values,
so the field no longer holds the in-game position, and the game coordinates
survive only in `data.ts`. Nothing reads the field today — the frontend carries
it in `RaidBoss` and renders it nowhere — so the switch costs no behaviour now.
The map screen is the consumer that will care, and it works in map space.

The spec needs no delta for this: it says a boss carries "its position on the
world map and in world coordinates" and makes no claim about the units or about
the values being whole.

### Icons nothing references are left in place

Thirty items move from a shared generic icon to a specific one, leaving 19 files
that no item points at.

Deleting them would mean the seed distinguishing "the catalogue abandoned this"
from "an operator uploaded this", which it cannot. Nineteen files is a smaller
problem than a seed that deletes media. This is written into the spec as a
stated rule rather than left as an accident.

### The new field reaches the frontend without a query change

The catalogue queries restrict `fields` only on drops; bosses are fetched with
`populate` alone, so a new scalar attribute arrives at the client for free. In
the list it is rendered as a `cyan` tag beside the gold `epic` one.

The `.epic` class in that component sets only `margin-left`, so it is spacing
rather than identity. It is renamed to something neutral and shared by both
tags, so that a third tag does not produce a third identical rule.

## Risks / Trade-offs

**A renamed item creates a second record instead of correcting the first** →
This is the whole reason the drop names were reconciled back to the stored
spelling before this change was proposed. Verified by deriving the catalogue
from both files and diffing the identifier sets: 0 bosses, 0 items and 0
boss-and-item pairs present under the old source are absent under the new one.
The spec now states the rule so the next revision is held to it.

**A chance or count that changes leaves a stale row behind** → It does not. The
drop upsert matches on the `(raidBoss, item)` pair, not on its values, so a
changed `chance` is an update of the existing row. Confirmed by the existing
seed tests, which re-seed the same slice and assert unchanged counts.

**The `subclass` column is added to a populated table** → It is a boolean with a
default, so existing rows take `false` and the seed then sets the four. No
backfill step and no migration script.

**`data.ts` drifts out of sync and stops being a real fallback** → Partly
accepted. It gains `subclass` in this change and is otherwise frozen. It is a
fallback for the source switch, not a maintained parallel catalogue, and the
moment it stops being that it should be deleted rather than repaired.

**The seed run is not reversible** → Reverting the constant makes the *next*
seed read `data.ts` again, but it does not remove the 5 bosses, 159 items and
820 drops already written. A true rollback is a database restore. This is why
the switch is the last step of the sequence rather than the first.

## Migration Plan

The order is chosen so that the suite is green after every step and the
database is touched exactly once, at the end.

1. **The field, in the data.** `types.ts` gains `subclass: boolean`;
   `data.ts`, `data-wiki.ts` and `missing.ts` gain the value on every entry.
   Nothing reads it yet.
2. **The field, in the plumbing.** The content type, the reader and the seeder
   carry it through. Still reading `data.ts`; every existing count holds.
3. **The field, at the edge.** The frontend type and the boss list tag.
4. **The switch.** `SOURCE_RELATIVE` moves to `data-wiki.ts`.
5. **The tripwires.** The counts and the chance probe in
   `catalog-source.test.ts`, plus a new invariant asserting exactly the four
   game ids grant a subclass.
6. **The prose.** The spec deltas, and the comments that state counts this
   change invalidates.
7. **One seed run.**

Steps 1–3 are independently shippable: after them the catalogue simply carries a
`subclass` that is `false` for everyone but four, from the old source. Step 4 is
the point after which a revert no longer undoes what is in the database.

Rollback: before step 7, revert the commit. After step 7, revert the commit to
stop further writes, and restore the database if the added records are
unwanted — they are additive and harmless if left.
