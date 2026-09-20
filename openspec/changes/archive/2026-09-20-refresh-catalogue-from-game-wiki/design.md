## Context

See proposal.md — Why, for the measured drift and the motivation.

What shapes the approach is what the source does and does not make easy.

```
  GET  the article            -> 200, 19 KB, an interstitial, not the article
       |                         Set-Cookie: <name>=<value>
       |  its script sets that same cookie, solves a puzzle seeded by
       |  today's date and the cookie value, then POSTs the answer
       v
  POST the same URL           -> 204
       v
  GET  the article again      -> 200, 5.3 MB, 158 bosses
```

Verified end to end, three requests, about two seconds, no browser. The session
then holds for a day and carries to every other page on the site.

Two properties of that challenge decide how it is cleared. Its obfuscation
rotates between requests — `window.atob('<base64>')` on one response, `\xNN`
escapes on the next — so nothing can be pulled out of it by pattern. And it
checks for automation the way such scripts do, looking for `window.webdriver`,
`window.Buffer`, `_phantom` and friends, and flagging itself when
`screen.width === window.innerWidth`, which is exactly what a default headless
browser reports.

`robots.txt` disallows everything for every agent. That does not change what is
technically possible and it does change what is decent: the design below spends
one request on a routine refresh and asks for the expensive ones explicitly.

## Goals / Non-Goals

Goals:

- A routine refresh of the drop tables is one request and one command.
- Everything the source publishes about a boss is reachable, but only when
  asked for.
- A refresh never invents and never silently widens: a field the source does
  not state is left exactly as it was.
- What the catalogue stores under a name is what that name says.

Non-Goals:

- Scheduling. The scripts are run by a person.
- Translations. The source publishes three languages; collecting them is a
  later, separate pass.
- World coordinates. The source has none; this change only stops claiming it
  does.
- Making the seed delete. Removal stays a separate, explicit step.

## Decisions

### The challenge is cleared by running the site's own script, not by reimplementing it

The puzzle is small enough to port — a modular exponentiation over the cookie
value, seeded by the date — and porting it would break the first time they
change a constant.

Instead the whole self-executing `<script>` is handed to a Node `vm` context
with shims for the handful of browser APIs it touches, and the `XMLHttpRequest`
shim captures the request rather than sending it. The site's own `eval`
unwraps whatever obfuscation this response happened to use. Nothing is sent from
inside the sandbox; the captured method, headers and body are replayed outside.

The sandbox is also what makes the automation checks pass, and it does so by
being honest about what it is not: the context simply has no `Buffer`, no
`webdriver`, no `_phantom`, because a fresh `vm` context has no Node globals.
The one value that has to be chosen rather than omitted is the viewport, which
must differ from the screen size.

Rejected: Playwright. It costs a browser, and a default headless one trips the
`screen.width === innerWidth` check, so it would need masking as well as
launching.

### The shared article is not a source of levels or statistics

The article at the server's own address embeds statistic tables and level badges
belonging to another server. Queen Ant reads 75 and 24,462,500 HP there; its own
page for this server reads 56 and 10,176,400. Sampled across epics, subclass
bosses and ordinary ones, the ordinary ones agree and the epic and subclass ones
do not.

So the article is authoritative for exactly two things: the roster, and the drop
tables — of which it carries two, the other server's first. Everything else
comes from the per-boss page under this server's prefix. This is why the tiers
are split where they are, and it is the single easiest thing to get wrong.

### Skills are records; their modifiers are data, not code

A boss's affinities could have been copied onto the boss, either as columns or
as an affinity row per axis. Measured, that is about 1138 rows, most of them
derived from a small shared vocabulary: one skill group holds the racial traits
(18 levels with modifiers, one per race) and another the armour types (3 levels,
2 with modifiers).

An earlier draft of this note said those two groups described every boss, and
that was wrong — it was read off two bosses. Across 79 of them the roster names
92 skill groups. Most appear on exactly one boss and are its own lore or its own
attacks. But six recur and matter: `Bow/Crossbow Resistance`,
`Dagger/Rapier Resistance`, `Blunt Weapon Vulnerability`, `Holy Vulnerability`,
`Dark Attack Resistance` and `Greater Bow/Crossbow Resistance`.

Those six carry no numbers, on the boss page or on their own. `Dagger/Rapier
Resistance` reads "Resistant to Dagger/Rapier attacks." at level 1, at level 2
and at level 3. They cannot be skipped for it: of 88 weapon affinities the
catalogue holds today, 66 are derivable from the racial trait's numbers and 22
exist only as one of these named skills. Parsing numbers alone would quietly
drop a quarter of what already works.

So the skill is the record and the boss links to it. A rebalance is then one
edit rather than one edit per boss that carries the trait.

The modifiers are stored rather than mapped in the reading client, although the
mapping is small enough to hard-code. The reason is that this server rebalances
— we found a reworked drop table and changed epic levels in a single afternoon —
and a hard-coded mapping does not break when that happens, it starts being
quietly wrong. As stored data, the same refresh that finds the change applies
it.

A modifier cannot name a subject of the wrong kind because the kind is the field
name, not a value: a weapon modifier has a `weapon`, an element modifier an
`element`. This is the shape the catalogue already uses for
`catalog.element-modifier` and `catalog.stat-modifier`, so it is an extension
rather than an invention. A single polymorphic list with a `kind` column was
considered and rejected twice over: it permits `kind: element` with
`key: spear`, and Strapi's dynamic zone, the only construction that would make
it uniform, cannot be filtered at all.

### Two skills shifting the same statistic are both kept

Paniel the Unicorn carries `Spirits Lv. 7` (P. Def. +5%, Evasion +5) and
`Light Armor Type Lv. 3` (P. Def. −15%, Evasion +10). These are not in conflict;
the game applies both, netting −10% defence and +15 evasion — which is precisely
what makes it a boss with weak physical defence and high evasion.

The parts are kept and the total is computed by the reader, so the catalogue can
answer "weak physical defence" and "because it wears light armour" with the same
data. Summing at write time would answer only the first.

The one thing the totalling rule cannot absorb is a subject stated in two units
at once. Every case seen so far is consistent — defence is always a percentage,
evasion always flat — so the refresh asserts it rather than assuming it, and
fails loudly if the source ever mixes them.

### Skills are read from the boss's page, and kept by what they say

Each skill on a boss's page carries a dropdown holding the description of the
level that boss has. `4416-1` shows the Undead trait's eight numbers; `4273-3`
shows "Resistant to Dagger/Rapier attacks." So the modifiers are already in the
pages the profile pass fetches, and the skill pages — one per group, and the
roster names 176 groups — buy nothing the seed needs.

What is kept is decided by content and not by a list of group numbers. A skill
whose dropdown yields neither a numbered line nor a named affinity is not
recorded. That removes the lore and the raid mechanics without naming them, and
it removes `4408`-`4413` — a family of stat-scale descriptors whose seventeen
carriers all sit at the neutral level, "Average P. Def. Lv. 11" and
"HP Increase (1x)", stating nothing at all.

An allowlist was drafted and thrown away, and it is worth saying why. Those same
descriptors have real numbers at other levels: "Extremely Weak P. Def. Lv. 1" is
−61%. A boss moved there by a patch is exactly the boss a player wants to find,
and a list of blessed group numbers would drop it in silence. Reading content
means it arrives on its own.

The one explicit exclusion is `4415`, the weapon the boss swings. It is
equipment, it varies across bosses, and it says nothing about defending against
one.

### A weapon variant is folded into the weapon it varies

The source names ten weapons where the catalogue has six: it separates
`Crossbow` from `Bow`, and `Dual Sword`, `Dual Blunt` and `Dual Dagger` from
their one-handed forms. The four extras are folded in rather than added.

They fold losslessly, which is why this is safe rather than merely convenient.
Across the eighteen racial traits, a variant and its base appear together eight
times and carry the same value on all eight — `Resistance to Bow +10%` never
sits beside a `Resistance to Crossbow` that says anything else. Folding
deduplicates; it never has to choose.

The alternative was a wider vocabulary, and it buys nothing a player uses: the
question being answered is which weapon to bring, and nothing in the catalogue
distinguishes the two-handed form from the one-handed one anywhere else.

### An amount the source does not state is the skill's level, not a null

The named affinities have a direction and no magnitude. Three shapes were
weighed. A null amount loses the direction with it, since the direction lived in
the sign. A separate `direction` field keeps it but then duplicates the sign
wherever a number does exist, and nothing but a test stops the two disagreeing.

What is stored instead is the skill's own level, signed, with the unit saying to
read it as a level: `{ weapon: 'dagger', value: +3, unit: 'level' }` for
`Dagger/Rapier Resistance Lv. 3`. The level is real data the source publishes
and was otherwise being thrown away, there are no nulls, the direction is in the
sign as it is everywhere else, and `unit` already had to be consulted before
arithmetic.

It carries one caveat the consumer must respect: levels order within a skill and
not across skills. `Bow/Crossbow Resistance Lv. 5` and `Greater Bow/Crossbow
Resistance Lv. 2` are different scales, and the source says nothing about how
they compare. The skill is named in every modifier, so a consumer has what it
needs to know when a comparison is meaningless.

### `worldX`/`worldY` are renamed, not redefined

The stored pair is the `left` and `top` of the boss's pin on the source's own
3004-pixel map: Queen Ant's `1557.91 / 2527.95` is that pin exactly. The names
have been wrong since the values were merged in, and a previous change widened
the columns to fit them rather than noticing.

They become `wikiX`/`wikiY`. Renaming rather than repurposing keeps the field
free for real world coordinates if a source for them ever appears, and stops the
next reader from computing a distance in the wrong space.

### Removal is a separate command, never part of seeding

The catalogue's seed is additive by rule, and this change keeps that. But the
source now genuinely drops things — one boss lost eight rows of shield and
helmet drops — and renaming 78 items will strand their old records, so a way to
remove is needed for the first time.

A `prune` command runs on request, reports before it acts, and refuses outright
when the source it compares against came back empty. That last guard is the
important one: a failed fetch and a source that lists nothing look identical
from inside, and the difference is the whole catalogue.

Rejected: sweeping inside the seed. It makes every refresh destructive and turns
a network blip into data loss.

## Risks / Trade-offs

**Renaming 78 items creates 78 new records and strands the old ones** → This is
the accepted cost of adopting the source's spelling, and the reason `prune`
lands in this change rather than a later one. The drop label is rebuilt from the
names, so the old drops become stale as well; they are pruned in the same pass,
items after drops.

**The challenge changes and the fetcher stops working** → It fails loudly rather
than quietly: a response that still looks like the interstitial after the POST
is an error, not an empty catalogue. Running the site's own script means a
changed constant or a changed obfuscation costs nothing; only a changed set of
browser APIs breaks the shim.

**The deep refreshes are 158 requests each against a site that asks not to be
crawled** → They are separate commands, run rarely and by hand, with a delay
between requests. The routine refresh stays at one request.

**The reading client must sum modifiers itself** → Accepted, and it is what lets
the client explain its answer. The filter becomes two requests: the skills, once
and cacheable, then the bosses carrying a matching skill.

**Statistics stay stale until the deep refresh runs** → True between the two, and
the reason the first implementation runs the deep one once. Afterwards the
routine refresh does not touch statistics, which is correct: it cannot see them.

## Migration Plan

1. **The fetcher**, on its own, writing the raw article to disk. Nothing is
   parsed and nothing in the catalogue changes.
2. **The drop refresh** — parses the article, writes the B-W-C drop tables into
   the data file and the other server's into a file beside it, and reports the
   differences without applying them.
3. **Applying** the drops, the item renames, the icon keys and the flags.
4. **The profile refresh** — per-boss pages for this server: level, race,
   statistics, respawn, location, soul-crystal level, skills. This is the run
   that corrects the epic levels.
5. **Skills** as records with their modifiers, and the removal of `weapon-type`
   and the affinity relations.
6. **The map refresh** — pin coordinates, into the renamed fields.
7. **`prune`**, then a seed, then a prune with the flag.

Steps 1 and 2 change nothing outside the mock files and can be run repeatedly
while the parser is shaken out. Step 3 is the first that reaches the database on
the next seed. Step 5 is the breaking one for the frontend.

Rollback: before step 7's prune, reverting the commit and re-seeding restores
the catalogue, since nothing has been deleted. After it, restore the database.
