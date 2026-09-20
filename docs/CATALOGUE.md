# The raid-boss catalogue

How to bring the catalogue up to date after the game server patches, and what
the pieces are.

This is a runbook, not an architecture note — read the code and the OpenSpec
specs for the design. What is here is the part that is not recoverable from
either: the order the commands go in, why it is that order, and the two ways of
getting it wrong that produce a wrong answer quietly rather than an error.

## Where the data lives

The catalogue is built from a mock that lives in the repository, and seeded from
it. The mock is the record; the database is a copy.

```
apps/backend/mocks/raid-bosses/
  data-wiki.ts        158 bosses: level, race, statistics, respawn,
                      coordinates, soul-crystal level, and the keys of the
                      skills each one carries
  drops.ts            3761 drop rows keyed by the game's boss id, each with
                      the item's grade and the rate it actually falls at
  skills.ts           25 skills and what each one shifts about a fight
  world-map.ts        two maps and the dungeon plans
  data-wiki-gamma.ts  the other game server, kept because it costs nothing:
                      level, statistics and drops only
  types.ts
  images/             item icons, skill icons, avatars, dungeon plans, maps
```

Every generated file carries `SOURCE_READ_ON`, the date of the copy of the
source it was built from. `pnpm --filter backend seed:catalog` prints the oldest
of them, so the age of the catalogue is visible without going looking.

## The source

<https://masterwork.wiki/lu4-b-w-c/posts/post/385-raid-bosses> and the pages it
links to. Two things are worth knowing before running anything against it.

**It sits behind a JavaScript interstitial.** The fetch helper clears it by
running the page's own script in a `vm` sandbox and replaying the request it
produces. The sandbox deliberately lacks the globals the script probes for —
`Buffer`, `webdriver`, `_phantom` and the rest — and reports a viewport
different from its screen size, because a match is one of the things it checks.

**`robots.txt` disallows everything.** These commands are run by hand, a few
times a year, not on a schedule. They pause three to six seconds between
requests with the gap randomised, never retry a 429 or a 403, stop after two
consecutive failures and refuse to exceed 400 requests in one run. An earlier
version ignored most of that and the host throttled the address for a while.

## The passes

Each one reports by default and writes only when asked. The report is worth
reading: adopting the source's spelling renames items, and a renamed item is a
new record under a new slug rather than an edit to an old one.

| Command | Requests | Writes |
| --- | --- | --- |
| `refresh:drops` | 1 | drop tables, item grades and names, item icons, epic and subclass flags |
| `refresh:profile` | 158 | level, race, statistics, respawn, soul-crystal level, skill keys |
| `refresh:skills` | 0, plus one per icon it does not hold | `skills.ts` and the skill icons |
| `refresh:map` | 158 | `wikiX`/`wikiY`, plus the source's own map the first time |

Each has a `:write` sibling — `refresh:drops:write` and so on — so no flag has
to be remembered, and each ends by naming the command that comes next.

`refresh:skills` costs nothing because the modifiers are already in the boss
pages that `refresh:profile` fetched: the dropdown beside a skill on a boss's
page states the description of the level *that boss* has.

## The order, and why

```
drops  ->  profile  ->  skills  ->  map  ->  build  ->  seed  ->  prune
```

**`drops` first** because it renames items and boss slugs. Run after the others,
those renames land on records the other passes have already described under the
old names.

**`skills` after `profile`** because it reads the boss pages `profile` fetched
rather than fetching its own. Run first, it builds the skill vocabulary from
whatever copy happens to be on disk.

The rest is dependency order: the mock has to be complete before the seed reads
it, and the prune compares the database against the same mock.

## The cache, which is the thing to get right

Pages are cached under `apps/backend/.tmp/wiki-cache/<YYYY-MM-DD>/`, one folder
per copy, named for the day it was taken. Passes use **today's** by default.

That default is the whole point. A copy that never expired was the previous
arrangement, and it meant the entire sequence would report "no differences"
against a copy from last week and be believed — a wrong answer with no symptom.
With a folder per day, a refresh after a patch fetches a new copy by itself and
there is nothing to remember.

```bash
# Read an older copy deliberately — to re-parse without requests, or to finish
# a run that was interrupted yesterday.
pnpm --filter backend refresh:profile -- --cache=2026-09-19

# Continue a large pass in pieces. Already-fetched pages come from the copy.
pnpm --filter backend refresh:profile -- --limit=30
```

Every pass says which copy it is using and how many pages are in it. When
today's is empty and an older one exists, it names the command to reuse that one
before it starts fetching.

## Refreshing after a patch

```bash
cd /path/to/rb-timer

# 1. Back up first. Seeding only ever adds and updates, but the prune deletes.
cd apps/backend
pg_dump -h localhost -U rb_timer -d rb_timer \
  --clean --if-exists --no-owner --no-privileges \
  -f "backups/rb_timer-$(date +%Y%m%d-%H%M%S).sql"

# 2. Read each report before applying it.
pnpm --filter backend refresh:drops
pnpm --filter backend refresh:drops:write

pnpm --filter backend refresh:profile        # about ten minutes
pnpm --filter backend refresh:profile:write

pnpm --filter backend refresh:skills:write   # no requests

pnpm --filter backend refresh:map            # about ten minutes
pnpm --filter backend refresh:map:write

# 3. Into the database.
pnpm --filter backend build
pnpm --filter backend seed:catalog

# 4. Remove what the source dropped. Read the list first.
pnpm --filter backend prune:catalog
pnpm --filter backend prune:catalog:delete
```

A full run is about 320 requests and twenty-five minutes of mostly waiting.

## Seeding and pruning

**`seed:catalog`** is idempotent and only ever adds or updates. Every record is
matched on a key that does not change — a grade's code, a slug, a game id, a
boss-and-item pair — so a second run leaves the row counts where they were.
Images are matched by filename before uploading, because Strapi does not
deduplicate and a careless re-run would add a second copy of every image.

**`prune:catalog`** is the only command that deletes, which is why it is separate
and why it reports first. It removes, in order, the drops the source no longer
states, the bosses it no longer lists, and the items nothing drops any more. It
refuses to run at all if the source yields no bosses — an empty source and a
game with no raid bosses look the same from there, and the difference is the
whole catalogue. Media is never removed: a file nothing references looks exactly
like one an operator uploaded.

## Where the maps end up

The two maps do not sit loose in the media library. They hang off a single type
of their own, readable at `/api/map`:

```
  map       3072x4096   what a boss's mapX/mapY and every dungeon plan are on
  wikiMap   3004x3004   what a boss's wikiX/wikiY are pixels of
```

They need a record because a file's public URL carries a suffix the upload
assigns, so it changes on the next seed and cannot be written down anywhere.
The pixel basis for the coordinates is each image's own width — read it from
the image rather than recording it beside them.

## Grades

Both an item's grade and a boss's come from the source, not from a rule.

- An **item** takes the grade the reference states beside it. It is stated on
  every drop row and never disagrees with itself across rows.
- A **boss** takes the strongest grade in its drop list.

The catalogue used to infer both — an item's from its name and from the levels
of the bosses that drop it, a boss's from level bands — and disagreed with the
source on 500 of 850 items.

`apps/backend/src/helpers/catalog-grades.json` holds grades set by hand in the
admin panel, exported with `pnpm --filter backend export:catalog-grades`. A
hand-set grade beats anything derived and survives re-seeding. The case it
exists for today: the four subclass bosses drop nothing but ungraded spellbooks,
so the rule puts them at `NG`.

## Things that will bite

**A `--write` run on an old copy.** Passes default to today's folder, so this
takes deliberate effort now, but `--cache=` will happily apply a copy from any
date. The date lands in `SOURCE_READ_ON` either way, so it is recoverable.

**Hand-set grades are not in the database.** They live in
`catalog-grades.json`, and only get there when someone runs
`export:catalog-grades`. Grades set in the admin panel and never exported are
lost at the next seed.

**Writing a media field last, through the Document Service, hangs the seed.**
The call returns, but it leaves a populate of its own response running that it
never awaits; shut the app down straight afterwards and that query spends sixty
seconds failing to acquire a connection from a pool that has already closed, and
the process exits non-zero with every record correctly written. Passing
`populate: {}` or `fields` does not stop it. The catalogue's own record is
therefore written through `strapi.db.query`, which is the one place in the seed
that goes around the Document Service — see the comment there for why nothing is
lost by it. Every other record is followed by thousands more operations, so the
populate finishes long before anything shuts down.

**Slug changes create records rather than editing them.** A renamed item is a new
row; the old one survives with no drops until a prune removes it. That is what
the rename report before a `--write` is for.
