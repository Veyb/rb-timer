## 1. Settling which bosses differ

- [x] 1.1 Read the 103 Gamma boss pages the cache does not hold, into the day's copy, at the pacing every other pass uses. 55 are already there, so the run is about eight minutes; verify the cache ends with 158 and that a second run fetches nothing Done: 158 pages held, 105 fetched in eight minutes. They went into the copy of 19 September rather than a fresh one, so the comparison runs inside a single snapshot of both servers.
- [x] 1.2 Compare all 158 on every field both servers state — level, all ten statistics, soul-crystal level, respawn, race and skills — and report the bosses that differ with the fields that differ. Verify the seven already known come out, and report any eighth prominently rather than folding it in silently: an eighth is the finding this sweep exists for Seven, and the article had flagged all seven. No eighth: 158 bosses compared on level, all ten statistics, soul-crystal level, respawn, race and skills.
- [x] 1.3 Record the outcome in the change and in the file's header with its date: whether the fields the shared article states are a sufficient detector, and on what evidence. Today's claim rests on 48 of 151 bosses; after this it rests on all of them, or on a named exception Recorded in the file header with the date and the evidence, and pointing at `--sweep` as the way to check it again rather than re-derive it. The claim now rests on all 158 rather than on 48.

## 2. The pass

- [x] 2.1 Add `refresh:gamma`, reporting by default and writing only when asked, ending with the command that follows it like every other pass; verify a plain run lists the differing bosses and writes nothing
- [x] 2.2 Read the article from the day's cache rather than fetching it again — the drop refresh already put it there — and fetch only the pages of the bosses the comparison flags. Verify a run after `refresh:drops` costs the flagged bosses' pages and nothing more Verified: a plain run reads the seven the article flags, not 158.
- [x] 2.3 Refuse to write when the comparison finds no differences at all, leaving the existing file untouched; verify a deliberately broken comparison exits non-zero and changes nothing Verified by breaking the comparison on purpose: the run exits non-zero, names what an empty answer means, and leaves the file byte-identical.
- [x] 2.4 Report a boss present on one server and absent from the other rather than guessing what it means. Neither happens today — both lists hold the same 158 — so this is a tripwire, and it should say which side is missing Both rosters hold the same 158 today, so this is a tripwire rather than a behaviour anyone will see.
- [x] 2.5 Stop `refresh:drops` writing the Gamma file, which it has done since that file existed. Left in place it would overwrite this change's work on the next routine refresh, in the old shape and importing a type that no longer exists — and nothing would have complained, because the mocks are outside the type check. Verify a `--write` run of the drop refresh leaves the Gamma file byte-identical Verified by checksum. The drop refresh keeps fetching icons for both servers' tables: the Gamma rows are written elsewhere now but land in the same directory, and all 299 of them already have a file.

## 3. What gets stored

- [x] 3.1 Replace `GammaBossInfo` with the catalogue's own shapes: the differing bosses as `RaidBossInfo` and their drops as `RaidBossDrops`, keyed by the game's id the way `drops.ts` is. Verify both parse through the reader's `vm` path `GammaBossInfo` is gone; the file exports `GAMMA_BOSSES: RaidBossInfo[]` and `GAMMA_DROPS: RaidBossDrops`. Verified through the reader’s `vm` path: 7 bosses, 7 drop keys, no dangling skill key, ten statistics each.
- [x] 3.2 Take the values that differ from the Gamma page and the rest from this server — identity, location, imagery and both coordinate pairs. Verify no recorded location is the Gamma page's, which names them in another language, and that the seven keep the names this catalogue already uses Verified: no record carries a Cyrillic character, and every name, location and coordinate pair matches this server’s.
- [x] 3.3 Write the drops for the differing bosses from the article's Gamma table, folding the group gate into the rate as the main catalogue does; verify the seven carry 299 rows between them 299 rows across the seven, folded through the same rule the main catalogue uses — which moved into `drop-row.js` rather than being copied, since two passes now write drop rows.
- [x] 3.4 Rewrite the file's header to say what the file now is: the difference rather than a copy, the rule that an absent boss is one the servers agree about, where each field came from, and how many bosses were checked to be identical. Verify the file is about 56 KB rather than 965 78 079 bytes against 988 025 — 92% smaller.

## 4. Leaving it findable

- [x] 4.1 Put `refresh:gamma` into the chain the passes print, so the sequence leads through it rather than leaving it to be remembered; verify the chain still leads from the first pass to the seed The chain now reads drops -> profile -> skills -> map -> gamma -> build -> seed -> prune.
- [x] 4.2 Add the pass to `docs/CATALOGUE.md` with what it costs and when it is worth running — Gamma is the older, settled server and does not move on the cadence this one does
- [x] 4.3 Confirm nothing regressed in what the catalogue serves: the reader, the seed, the database and the frontend do not touch this data, so `pnpm -r check-types`, `pnpm -r check` and the backend suite should pass unchanged 209 backend tests, `check-types` and `check` all pass unchanged, which is what nothing reading this data was supposed to mean.

## 5. Applying the spec

- [x] 5.1 Apply the delta to `openspec/specs/raid-boss-catalog/spec.md`; verify `openspec validate record-gamma-where-it-differs --strict` passes
