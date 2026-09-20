## Why

The catalogue keeps a copy of the other game server, Gamma, that is both too
big and too thin to use. It holds all 158 bosses at 965 KB — 94% of the size
limit above which the linter silently stops checking a file — and 151 of those
bosses are bit-identical to this server's. What it holds for the seven that do
differ is only what one shared article states: a level, eight statistics and a
drop table. The two statistics that differ most, accuracy and evasion, are not
among them, and neither is the soul-crystal level, which the epics carry on
Gamma and not here.

So the file is a partial copy of mostly-identical data. Nothing reads it, and
nothing could: a feature built on it would find the interesting fields missing.

The Gamma server is older and settled, which is exactly why this is worth
closing now rather than later: the data is not moving, the pages needed are
few, and 55 of them are already cached. Left as it is, the question returns
every time someone wonders whether the copy is complete.

## What Changes

- Check once, against the source, which bosses actually differ. The current
  answer of seven comes from comparing the fields one article states. That
  article cannot see accuracy, evasion, the soul-crystal level, respawn or
  skills, so a boss differing only in those would not be noticed. 48 of the
  151 have been compared on their own pages and none differs, but the other
  103 have never been looked at. This change looks at them, once.
- **BREAKING** — `data-wiki-gamma.ts` stops holding every boss and holds only
  those that differ, in the shape the rest of the catalogue uses. A boss absent
  from it is one the two servers agree about, and this server's record applies
  to it unchanged.
- Those bosses are recorded in full rather than as the article's subset. Their
  own pages state accuracy, evasion and the soul-crystal level, and the seven
  pages this costs are already cached.
- Numbers and skills come from the Gamma page; identity and geography come from
  this server. The boss is the same boss standing in the same place, and the
  spawn pins were already proven identical. The Gamma pages name locations in
  another language, so taking a name from them would be a regression.
- The refresh reports how many bosses differ and refuses to write none, because
  an empty answer means the comparison broke rather than that the servers
  agree.

## Capabilities

### Modified Capabilities

- `raid-boss-catalog`: what the catalogue keeps about a server other than its
  own. The existing rules say where each field comes from and that per-server
  fields must be taken from per-server pages; they say nothing about recording
  a second server, which is what this adds.

## Impact

- Affected data: `apps/backend/mocks/raid-bosses/data-wiki-gamma.ts` drops from
  965 KB to roughly 56 KB. Its exported shape changes, and so does
  `GammaBossInfo` in `types.ts`.
- Affected scripts: the comparison and write currently live in
  `refresh:drops`, which reads only the article. Fetching per-boss pages
  belongs elsewhere.
- Not affected: the database, the seed, the reader and the frontend. Nothing
  reads the Gamma data today, which is what makes the shape safe to change.
- Not affected: this server's own records. The comparison reads them; it never
  writes them.
- Cost: about 103 requests once, then seven per refresh. The routine refresh
  keeps using the article to decide who differs — the sweep is what establishes
  that the article is a sufficient detector, recorded with its date and result.
