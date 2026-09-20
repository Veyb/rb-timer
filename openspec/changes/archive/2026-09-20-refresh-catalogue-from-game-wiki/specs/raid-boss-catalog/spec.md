## ADDED Requirements

### Requirement: A boss's strengths and weaknesses come from the skills it carries

What makes a boss easier or harder to fight SHALL be recorded as the skills it
carries rather than as values copied onto the boss. A skill SHALL be a record of
the catalogue and the same record SHALL serve every boss that carries it, so
that a rebalance is one edit rather than one edit per boss.

A skill SHALL carry the game's identifier for it, its level, a display name, its
icon, and its modifiers. A modifier SHALL name what it shifts, by how much, and
in what unit that amount is read. The amount SHALL be signed: a positive amount
is resistance, a negative amount is vulnerability. Resistance and vulnerability
SHALL NOT be two separate lists, because they are one measurement read in two
directions.

The source does not state a magnitude for every affinity. Some skills publish a
number — a percentage or a flat amount — and others publish only a name that
says which way it goes, with the skill's own level as the only thing that
varies. A modifier of the second kind SHALL carry that level as its amount and
SHALL say so in its unit, rather than carrying an invented number or no number
at all. Amounts SHALL be comparable and summable only within one unit, and
amounts stated as a level only within one skill.

A subject stated in two units is not a defect. A boss may be told about the same
weapon twice — by its race, with a number, and by a skill of its own, with a
level — and both SHALL be kept. Where two such statements point opposite ways
the catalogue SHALL keep both and report it rather than choose between them. A
skill SHALL carry whether it describes the boss itself, its race or its
equipment, so that a reader can rank them: what a boss is told about itself
outweighs what it is told about its race.

A modifier SHALL NOT be able to name a subject of the wrong kind. A modifier to
a weapon SHALL draw its subject from the weapon vocabulary, one to an element
from the element vocabulary, and one to a statistic from the statistic
vocabulary, so that a weapon cannot be recorded as an element.

Only skills that say something about defending against the boss SHALL be
recorded — whether they say it with numbers or only by naming an affinity and a
direction. The source also publishes lore, shared mechanics and the boss's own
attacks as skills; none of those change how a boss is fought against, and they
are not part of the catalogue.

A boss MAY carry any number of skills, including none. Where two of a boss's
skills shift the same subject, both SHALL be retained rather than summed into
the record: the total is what a reader needs, and the parts are how the
catalogue can say why.

#### Scenario: One skill serves every boss that carries it

- **WHEN** two bosses carry the same skill
- **THEN** both name the same record
- **AND** changing that record's modifiers changes what both report

#### Scenario: A skill's modifiers are read with their direction and size

- **WHEN** a skill grants resistance to spear of ten percent and vulnerability
  to fire of ten percent
- **THEN** the spear modifier reads `+10` and the fire modifier reads `-10`
- **AND** each states whether it is a percentage or a flat amount

#### Scenario: Two skills disagreeing about one subject are both kept

- **WHEN** a boss's race states a vulnerability to a weapon and a skill of its
  own states a resistance to it
- **THEN** both are returned
- **AND** the disagreement is reported rather than resolved by dropping one

#### Scenario: Two skills shifting the same statistic are both kept

- **WHEN** a boss carries one skill granting five percent physical defence and
  another costing fifteen percent
- **THEN** both modifiers are returned
- **AND** a reader can tell which skill each came from

#### Scenario: A skill with no modifiers is not recorded

- **WHEN** the source publishes a skill carrying only descriptive text
- **THEN** no skill record is created for it
- **AND** no boss references it

#### Scenario: Bosses are found by what they are weak to

- **WHEN** a caller asks for bosses carrying a skill whose spear modifier is
  negative
- **THEN** only bosses carrying such a skill are returned

### Requirement: Grade is one ordered vocabulary, stated by the source

Grade SHALL be a set of records shared by bosses and items rather than a
per-record list of permitted values, so that adding a grade is a single edit and
so that records can be sorted into game order.

Each grade SHALL carry a code, a display label and a rank. The rank SHALL order
the grades weakest-first: `NG`, `D`, `C`, `B`, `A`, `S`. Sorting bosses or items
by grade SHALL follow that rank and not the alphabetical order of the labels.

Every boss and every item SHALL carry a grade, and neither SHALL be guessed at
where the source states one.

An **item** SHALL take the grade the source states for it. The reference
publishes one beside every item it lists, on every row of every drop table, and
never states one item at two grades. Nothing SHALL be inferred from the item's
name, which describes what a thing is used on and not what it is, nor from the
levels of the bosses that drop it.

A **boss** SHALL take the strongest grade in its drop list, since that is what
the grade is for: what a boss is worth fighting for. A boss whose drops carry no
grade at all SHALL take the weakest rather than a grade invented from its level.

A grade set by hand SHALL win over a derived one, and SHALL survive re-seeding.
It is the only way to overrule the source, and the case it exists for is a boss
whose reward is not equipment.

#### Scenario: Items sort into game order

- **WHEN** a caller requests items sorted by grade ascending
- **THEN** they are ordered `NG`, `D`, `C`, `B`, `A`, `S`, not `A`, `B`, `C`,
  `D`, `NG`, `S`

#### Scenario: A grade is added without touching bosses or items

- **WHEN** an operator adds a grade with a rank placing it after `S`
- **THEN** it becomes assignable to both bosses and items
- **AND** no existing boss or item record changes

#### Scenario: An item holds the grade the source gives it

- **WHEN** an item the source calls `C` is dropped by bosses of several grades
- **THEN** it holds `C`
- **AND** the grades of those bosses change nothing about it

#### Scenario: A name that states a grade does not override the source

- **WHEN** an item is called `Scroll: Enchant Armor (D-Grade)` and the source
  states no grade for it
- **THEN** it holds the weakest grade
- **AND** the `D-Grade` in its name is read as what it enchants, not as what it
  is

#### Scenario: A boss holds the grade of the best thing it drops

- **WHEN** a boss drops items graded `NG`, `D` and `C`
- **THEN** the boss holds `C`

#### Scenario: A boss whose drops carry no grade is not graded by level

- **WHEN** every item a boss drops is ungraded
- **THEN** the boss holds the weakest grade
- **AND** an operator may set it by hand instead

#### Scenario: A hand-set grade outlives the derived one

- **WHEN** an operator sets a grade that differs from the derived one and it is
  exported
- **THEN** seeding a fresh database reproduces the operator's grade

### Requirement: A boss carries its own combat statistics

A boss SHALL carry its combat statistics — hit points, mana, experience, skill
points, physical and magical attack, physical and magical defence, accuracy and
evasion. These are the boss's own numbers and SHALL NOT be derived from the
skills it carries, which shift them rather than state them.

#### Scenario: Statistics are the boss's own

- **WHEN** a boss is read
- **THEN** its hit points, attack, defence, accuracy and evasion are returned as
  its own values

#### Scenario: A boss with no skills still has statistics

- **WHEN** a boss carrying no skills is read
- **THEN** its statistics are present and its skill list is empty

### Requirement: The catalogue states where each field comes from

The catalogue is refreshed from a source that does not publish every field it
holds. A refresh SHALL change only the fields the source it read actually
states, and SHALL leave every other field as it was. Avatars, dungeon plans and
the hand-assembled world map have no counterpart in the source and SHALL survive
any refresh untouched.

An image the source does publish is a different matter. Where the catalogue
names an icon it does not hold — for an item or for a skill — the refresh SHALL
fetch it, convert it to the form the catalogue stores, and put it where the rest
of that kind live. An icon already held SHALL NOT be fetched again. A named icon
with no file is not a cosmetic gap: the seed uploads by path and fails on it.

A coordinate measured in the pixels of a particular image SHALL be stored
together with that image, at the size the coordinate was measured against. A
position in a picture nobody holds cannot be drawn and cannot be checked, and
one held at another size is wrong by a factor that nothing in the data reveals.

The source publishes some of its pages once for several game servers and others
once per server. Where a field is published per server, the catalogue SHALL take
the value for its own server and SHALL NOT take one from a shared page, even
when the shared page is filed under the server's own address. Levels and combat
statistics are such fields.

A field the source states is not automatically a field the catalogue takes. The
location of a boss the catalogue already holds SHALL NOT be refreshed: the
source names locations by transliteration of another language, so there is no
correspondence to follow, and the catalogue's own names were settled by hand.
Where the two disagree, the catalogue is right.

A boss the catalogue does not yet hold is the exception, because there is
nothing to preserve. Its location SHALL be recorded as the source states it, and
SHALL be reported prominently rather than merely written — the name arrives
transliterated and needs replacing by hand before anyone reads it.

A refresh SHALL be repeatable without a human choosing between versions: reading
the source twice without an intervening change SHALL leave the catalogue
unchanged.

#### Scenario: A refresh leaves what it cannot see alone

- **WHEN** a refresh reads a source that states drops but not imagery
- **THEN** the drops are updated
- **AND** every boss keeps its avatar, and every location its dungeon plan

#### Scenario: A coordinate's own map is part of the catalogue

- **WHEN** a boss states its position on the source's map
- **THEN** that map is held by the catalogue at the size the position is
  measured in
- **AND** it is distinct from the map the boss's other position is measured on

#### Scenario: An icon the catalogue lacks is fetched

- **WHEN** a refresh names an item or skill icon that the catalogue has no file
  for
- **THEN** that icon is fetched from the source and stored in the form the
  catalogue keeps

#### Scenario: An icon already held is not fetched again

- **WHEN** a refresh runs a second time
- **THEN** no icon is fetched

#### Scenario: A known boss keeps its location

- **WHEN** a refresh reads a page naming the location of a boss the catalogue
  already holds
- **THEN** the boss keeps the location the catalogue holds

#### Scenario: A new boss brings its location, and says so

- **WHEN** a refresh finds a boss the catalogue does not hold
- **THEN** its location is recorded as the source states it
- **AND** the run reports that a location was taken from the source and needs a
  name of its own

#### Scenario: A per-server field is taken from the per-server page

- **WHEN** a shared page states a boss at one level and the page for this
  server states it at another
- **THEN** the catalogue holds the level for this server

#### Scenario: Refreshing twice changes nothing the second time

- **WHEN** a refresh runs twice against an unchanged source
- **THEN** the second run reports no differences

### Requirement: Records the source has dropped can be removed

The catalogue grows by seeding and SHALL NOT shrink by it: seeding SHALL never
delete. Removing what the source no longer lists SHALL be a separate action that
an operator asks for.

That action SHALL report what it would remove before removing anything, and
SHALL refuse to run at all when the source it is comparing against failed to
load — an empty source is indistinguishable from a source that lists nothing,
and the difference is the whole catalogue.

It SHALL remove in dependency order: first the drops the source no longer
states, then the bosses it no longer lists, then the items no drop points at
any more. A boss left behind keeps a record with every drop taken from it one
at a time, which reads exactly like a boss that drops nothing. A record an
operator has graded by hand SHALL be reported rather than removed silently,
whether it is an item or a boss: the grade is work the catalogue cannot derive
again.

Imagery SHALL NOT be removed. An image the catalogue has stopped referencing is
indistinguishable from one an operator uploaded, and the cost of keeping it is a
file.

#### Scenario: Removal is reported before it happens

- **WHEN** an operator runs the removal without confirming it
- **THEN** the drops and items that would be removed are listed
- **AND** nothing is deleted

#### Scenario: An empty source removes nothing

- **WHEN** the source fails to load and yields no bosses
- **THEN** the removal refuses to run
- **AND** the catalogue is untouched

#### Scenario: An item is removed only once nothing drops it

- **WHEN** the last drop naming an item is removed
- **THEN** that item becomes removable
- **AND** an item still dropped by any boss is kept

#### Scenario: A boss the source has stopped listing is removed with its drops

- **WHEN** the catalogue holds a boss the source no longer lists
- **THEN** its drops are removed and then the boss itself
- **AND** a boss whose grade an operator set by hand is reported and kept

## MODIFIED Requirements

### Requirement: Catalogue imagery is stored once and shared

Boss avatars, item icons, dungeon plans and the world maps SHALL be stored as
managed media, replaceable by an operator without a deployment.

An avatar SHALL be a pair of images, a full-size and a miniature, held together
so the pair cannot drift apart, and SHALL be shareable by any number of bosses:
the catalogue has fewer distinct appearances than bosses. An icon SHALL likewise
be shareable by any number of items.

Replacing a shared image SHALL take effect for every record that references it.

An image that belongs to the catalogue as a whole rather than to any one record
SHALL still be reachable through the catalogue, and SHALL NOT be addressed by
its stored file name or URL. The store assigns a file a name of its own when it
takes it, so an image nothing references can only be found by someone who
already knows what this copy of the catalogue happens to call it — which is not
the same image after the next seeding.

Where a coordinate is expressed in the pixels of such an image, the size it is
measured against SHALL be read from the image rather than recorded beside it.

#### Scenario: Many bosses share one avatar

- **WHEN** several bosses reference the same avatar
- **THEN** each returns both the full-size and the miniature image

#### Scenario: Replacing a shared avatar reaches every boss

- **WHEN** an operator replaces the images of an avatar shared by several bosses
- **THEN** every one of those bosses returns the replacement

#### Scenario: An item without an icon

- **WHEN** an item has no icon
- **THEN** it is still valid and readable

#### Scenario: The world maps are reachable without knowing a file name

- **WHEN** a caller reads the catalogue
- **THEN** it returns both world maps with their addresses and their sizes
- **AND** seeding the catalogue again returns the same two images


### Requirement: The catalogue holds bosses, locations, items and drops

The catalogue SHALL consist of five related record kinds:

- a **boss**, carrying its display name, the game's own numeric identifier, its
  race, its level, whether it is epic, whether it grants a subclass, its
  position on the world map and on the source's own map, and its respawn
  information;
- a **location**, carrying a display name and, where one exists, a dungeon plan
  with the plan image and the rectangle it occupies on the world map;
- an **item**, carrying a display name and a grade;
- a **drop**, joining one boss to one item and carrying the drop chance and the
  minimum and maximum quantity;
- a **skill**, carrying what it shifts about a fight, shared by every boss that
  has it.

A boss's position SHALL be named for the map it belongs to. A coordinate that
locates a pin on the source's map SHALL NOT be called a world coordinate: the
two are different spaces, and a field named for the wrong one will be read as
the wrong one.

Every boss SHALL belong to exactly one location. A location MAY hold any number
of bosses, including none. An item MAY be dropped by any number of bosses, and
the same boss-and-item pair SHALL appear at most once.

A drop chance SHALL be a percentage between 0 and 100 and SHALL preserve
fractional precision to at least four decimal places, because the source states
chances at that resolution and rounding them would misreport the rarest drops.

#### Scenario: Reading a boss yields its location and drops

- **WHEN** a caller requests a boss with its related records
- **THEN** the boss's single location is returned
- **AND** each of its drops is returned with the dropped item, the chance and
  the quantity range

#### Scenario: Reading an item yields the bosses that drop it

- **WHEN** a caller requests an item with its related records
- **THEN** every boss that drops it is returned, each with the chance and
  quantity range for that boss

#### Scenario: A fractional drop chance is preserved

- **WHEN** a drop is stored with a chance of `37.7861`
- **THEN** reading it back yields `37.7861`, not a rounded value

#### Scenario: The same boss and item cannot be joined twice

- **WHEN** a second drop is created for a boss-and-item pair that already has one
- **THEN** the operation is rejected

#### Scenario: A drop must name an item

- **WHEN** a drop is created without an item, or an update clears the item
- **THEN** the operation is rejected

## REMOVED Requirements

### Requirement: Grade is one ordered vocabulary shared by bosses and items

**Reason**: The vocabulary half was right and continues unchanged as "Grade is
one ordered vocabulary, stated by the source". The derivation half was a guess
standing in for data the catalogue already had. The reference states a grade
beside every item on every drop row — 3761 of them, never disagreeing about an
item — and the parser read it and threw it away, while three inference rules
worked one out from item names and boss levels. Measured against the source,
those rules had 500 of the 850 items wrong in both directions: fragments and
recipes graded as equipment because a high-level boss dropped them, and real `C`
equipment left ungraded because an epic and an ordinary boss disagreed about it.
That last case is how the defect surfaced, as a long list of `C` gear sitting at
`NG`. The four scenarios here describe the rules that produced it, so they go
with them rather than being reworded.

**Migration**: Grades are read from "Grade is one ordered vocabulary, stated by
the source". An item takes the grade the source states; a boss takes the
strongest grade in its drop list, which is both what the grade means and
something measured rather than banded. Checked across all 158 bosses before the
swap: the level bands and the drop lists agree on 154 of them, no boss's top
grade rests on a single row, and no boss has an empty list. The four that differ
are the subclass bosses, whose drops are all ungraded because what they give is
a subclass; they take the weakest grade, and an operator who disagrees sets it
by hand as before. The concept of an item whose grade could not be derived
disappears with the rules that created it.

### Requirement: Combat characteristics are recorded as open vocabularies

**Reason**: The requirement bundled two things that have come apart. The
statistics half is unchanged and continues as "A boss carries its own combat
statistics". The affinity half described weapon types as catalogue records whose
label lives in one place, and per-boss element and stat modifier lists — a shape
chosen when weapons were the only affinity the source published. The game's own
reference states affinities as skills instead: a shared vocabulary of
twenty-five records that describes every boss in the game, carrying weapons,
elements and statistics in one form and with a magnitude the old shape could not
express. Keeping weapon types as records would leave weapons the only affinity
with a record of its own, for no gain now that translation is not required.

**Migration**: Affinities are read from "A boss's strengths and weaknesses come
from the skills it carries". The `weapon-type` collection and the boss's
`resistances` and `vulnerabilities` relations are removed; a boss's per-boss
element and stat modifier lists are removed with them, since both are now
modifiers on a skill. The six weapon labels move to the reading client, which
holds the element and statistic labels already.

### Requirement: Source defects are corrected on the way in

**Reason**: The defect belonged to the scrape and not to the game. That source
failed to produce a location identifier for two places and filed both under one
placeholder, so the reader carried a table naming them and split them apart on
the way in. The game's own reference names every location itself — Eastern
Border Outpost and Lachik Habitat arrive as `eastern-border-outpost` and
`lachik-habitat` — leaving the repair with nothing to repair. A correction whose
subject no longer exists is worse than no correction: nothing exercises it, so
nothing would notice if it began matching something it was never meant to.

**Migration**: Nothing is lost. The two places are still distinct locations with
distinct slugs, now because the reference states them separately rather than
because the reader takes them apart. The lookup table and the slug repair are
removed from the reader; "Bosses and items are addressable by a stable slug"
continues to require a distinct slug per record, and "A revised source is
applied in place" covers what happens when a later source states something
different.
