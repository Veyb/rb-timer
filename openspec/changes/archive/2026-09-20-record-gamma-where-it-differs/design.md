## Context

See proposal.md — Why. What follows is the measurement the decisions rest on.

The catalogue is built from this server's pages plus one shared article. That
article carries two drop tables per boss, this server's and Gamma's, and its
level badges and statistic tables are Gamma's — which is why nothing else is
read from it. `data-wiki-gamma.ts` is what the article states for Gamma: 158
bosses, a level, eight statistics and a drop table each, 965 KB.

Measured against this server's records:

```
  158 bosses on Gamma
      151  identical: level, all eight statistics the article states, every drop row
        7  differ

  the seven are exactly the three epics and the four subclass bosses

      Kaldrak / Naerith / Erdrath / Zephrath    lvl 60 -> 65, 5 statistics
      Queen Ant / Orfen / Core                  lvl 56,58 -> 75, 6 statistics
```

The spirits keep their hit points (1 461 913 on both) and move a rank; the
epics are different creatures, with three times the hit points.

The seven bosses' Gamma pages are already cached, from an earlier comparison.
Read, they state what the article cannot:

```
  accuracy / evasion    Queen Ant 104/109 -> 128/133      article states neither
  soul-crystal level    epics: none here -> 12 there      article states none
  respawn               identical on all seven
  race, skills          identical on all seven
  location              named in another language on Gamma
```

## Goals / Non-Goals

Goals:

- Know, rather than assume, which bosses differ.
- Hold complete records for those, so a later feature needs no further fetching.
- Leave a routine refresh no more expensive than it is now.

Non-Goals:

- Serving Gamma to anyone. Nothing reads this data and nothing will as part of
  this change; the database, the seed and the frontend are untouched.
- A world dimension on the catalogue's records. The wiki hosts at least four
  worlds — this server, Gamma, MasterWork and Eternal — and each publishes the
  same article. Supporting a reader's choice of world is a different change,
  and this one deliberately does not model it.
- Refreshing Gamma on the same cadence as this server. Gamma is the older,
  settled server; it moves rarely.

## Decisions

### Store the bosses that differ, in full — not a row-level difference

The obvious shape for "keep only what differs" is a difference per drop row:
added, removed, changed. Measured, it is the wrong shape here.

```
  the seven bosses' Gamma tables      299 rows
      of which identical to ours       36

  a row-level difference would store
      259 rows present only on Gamma       (additions)
      276 rows present only here           (removals — these must be stored too)
        4 rows differing in value
      ---
      539 rows
```

A difference degenerates when the two sides barely overlap, and these barely
overlap: on Gamma the epics drop a different set of items, not the same items
at adjusted rates. Storing the seven tables whole is 299 rows against 539, and
needs no reconstruction step to read.

Alternatives considered. Keeping every boss and marking the identical ones was
rejected: it keeps the 965 KB and adds a flag. Storing only the differing
*fields* of the seven was rejected because the saving is nil — the bulk is drop
rows, and statistics and levels are a handful of numbers.

Measured result of the chosen shape: about 56 KB against 988 025 bytes, a 94%
reduction.

### A boss absent from the record is a boss the servers agree about

The reconstruction rule is total and needs no marker: look the boss up by the
game's id, and if it is not there, this server's record stands unchanged.

This is what makes the shape safe to read without a helper. The alternative —
an explicit list of "checked, identical" ids — was rejected as 151 entries
restating the absence of information, though the *count* belongs in the file's
header so the claim is auditable.

### Numbers come from Gamma's pages; identity and geography come from ours

A Gamma page states the boss's level, all ten statistics, its soul-crystal
level, respawn, race and skills. It also names the location in another
language, and it is the same boss standing in the same place.

```
  from the Gamma page    level, ten statistics, soul-crystal level,
                         respawn, race, skills
  from this server       name, slug, epic and subclass flags, location,
                         avatar, mapX/mapY, wikiX/wikiY
  from the article       drops
```

Taking the second group from this server is not passing our numbers off as
theirs. The spawn pins were proven identical between servers — the catalogue
already reads every boss's pin from Gamma because this server publishes none —
and race, respawn and skills were verified identical on all seven. What is left
is identity: which boss, what it is called, what it looks like.

### The sweep happens once; detection stays on the article

The comparison that finds the seven reads the article, which states a level,
eight statistics and the drops. It cannot see accuracy, evasion, the
soul-crystal level, respawn or skills. A boss differing only in those would go
unnoticed.

48 of the 151 have been compared on their own pages, and none differs in any
field the article cannot see. That sample is not random — it is mostly the
bosses whose page on this server is thin, which is arguably a harder test than
a random draw, but it is 48 of 151.

So: read the remaining 103 Gamma pages once, settle the question, and record
the answer with its date. Afterwards the routine refresh keeps using the
article, because the sweep is what establishes that the article suffices.

The alternative — sweeping on every refresh — was rejected at 158 extra
requests per run against a host that has throttled us once, to re-prove
something about a settled server.

### The pass is its own command

`refresh:drops` reads the article and writes three files from one request. It
has no business fetching per-boss pages, and the passes that do are already
separate. A `refresh:gamma` fits the chain that exists: it reads the article
from the cache, compares, fetches the pages of whoever differs, and writes.

### The stored shape is the catalogue's own

`GammaBossInfo` — a level, eight statistics and drops — described a subset
because a subset was all there was. With complete records there is no reason to
invent a second shape:

```
  GAMMA_BOSSES: RaidBossInfo[]     the bosses that differ, complete
  GAMMA_DROPS:  RaidBossDrops      keyed by the game's id, as drops.ts is
```

A later feature then reads Gamma bosses the way it reads any other, and the
seed, if it ever wants them, has nothing to translate.

## Risks / Trade-offs

- A boss starts differing only in a field the article cannot see, after the
  sweep → The sweep establishes the blind spot is empty today, not forever. The
  mitigation is that the fact is written down with its date, so a later doubt
  has something to re-run rather than a reason to re-derive.

- The comparison breaks and reports no differences → Refuse to write. Two
  servers with nothing between them is what a broken comparison looks like;
  today the answer is seven.

- A boss exists on one server and not the other → Present only on Gamma, it is
  a full record with nothing to compare against. Present only here, it has no
  Gamma record, which is the same as agreement and is wrong. Neither happens
  today — both lists hold the same 158 — so the pass reports the case loudly
  rather than guessing.

- 103 requests against a rate-limiting host → The existing pacing applies: a
  three-to-six second gap, no retry on a refusal, a stop after two consecutive
  failures. About eight minutes, resumable through the day's cache folder.

- The change is breaking for any reader of `GAMMA_BOSSES` → There is none. That
  is precisely why the shape is worth changing now.

## Migration Plan

The file is regenerated, not migrated: one pass writes it whole from the source
and the comparison. There is no database state, no seeded record and no API
surface, so there is nothing to roll back beyond reverting the commit.

## Open Questions

- Whether MasterWork and Eternal deserve the same treatment. Each is one
  article request away and the machinery would be the same, but nobody has
  asked for them, and the answer belongs with whoever wants a world switcher.
- Whether the seven should eventually reach the database. They cannot until the
  catalogue has somewhere to put a second server's boss, which is the change
  this one is deliberately not making.
