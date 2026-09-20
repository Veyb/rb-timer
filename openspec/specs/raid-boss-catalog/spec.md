# raid-boss-catalog Specification

## Purpose
Holds the game's raid-boss reference data — bosses, where they stand, what they
drop and when they return — as queryable records rather than a frontend
constant, and makes it readable by any visitor, since it describes the game
world rather than any one community's records.

## Requirements

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

### Requirement: Bosses and items are addressable by a stable slug

Every boss and every item SHALL carry a slug that is unique within its kind,
drawn from the URL-safe character set, and stable across re-seeding, so that a
boss or an item can be addressed by a readable URL rather than by an internal
identifier.

A boss's slug SHALL be derived from the game's identifier and its name, so that
two bosses sharing a name remain distinguishable. An item's slug SHALL be
derived from its name.

#### Scenario: A boss is fetched by slug

- **WHEN** a caller requests the boss identified by `25372-discarded-guardian`
- **THEN** that boss is returned

#### Scenario: A duplicate slug is rejected

- **WHEN** a second boss is created with a slug an existing boss already holds
- **THEN** the operation is rejected

#### Scenario: Slugs survive a re-seed

- **WHEN** the catalogue is seeded a second time over an already-seeded database
- **THEN** every boss and item keeps the slug it had before

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

### Requirement: Respawn information covers both intervals and weekly schedules

A boss's respawn SHALL be recorded as one of two kinds.

An **interval** respawn SHALL carry a base duration and a variance, both in
minutes, meaning the boss returns between `base - variance` and
`base + variance` after being killed. Minutes are the stored unit whatever the
source expressed, so that durations shorter than an hour or longer than a day
need no change to the record.

A **scheduled** respawn SHALL carry a list of weekly entries, each naming a day
of the week and a time of day. The list length SHALL be unconstrained: a boss
may return once a week, several times, or on no fixed day yet recorded.

A scheduled respawn's times are wall-clock times on the game server. This
capability does not define which timezone that is; recording it belongs to the
change that introduces per-server data.

#### Scenario: An interval respawn is read back in minutes

- **WHEN** a boss whose source describes it as "6 hours ± 2 hours" is read
- **THEN** its base is `360` minutes and its variance is `120` minutes

#### Scenario: A scheduled respawn carries several entries

- **WHEN** a boss returns every Monday and every Thursday at 21:00
- **THEN** its respawn holds two entries, `monday 21:00` and `thursday 21:00`

#### Scenario: A scheduled boss with no entries yet

- **WHEN** a boss is known to be on a schedule but the days are not yet known
- **THEN** it is stored as a scheduled respawn with an empty entry list
- **AND** reading it does not fail

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

### Requirement: A boss states whether it grants a subclass

A boss SHALL state whether killing it grants a subclass. This is a value of its
own and SHALL NOT be inferred from the boss's level, race or grade, none of
which imply it.

The value SHALL be present on every boss. A boss that grants no subclass SHALL
say so rather than leave the question unanswered, so that a caller can tell
"does not grant one" from "not recorded yet".

The bosses that grant one SHALL be identified by the game's own numeric
identifier rather than by display name, which is subject to translation and to
the source's spelling. Four bosses grant a subclass: game ids `34141`, `34142`,
`34143` and `34144`.

Which bosses grant a subclass SHALL be answerable from the boss list —
including by filtering it — without opening each boss in turn.

#### Scenario: Every boss answers the question

- **WHEN** the catalogue is read
- **THEN** every boss states whether it grants a subclass
- **AND** none leaves the value unset

#### Scenario: Exactly four bosses grant a subclass

- **WHEN** the catalogue is seeded
- **THEN** the bosses with game ids `34141`, `34142`, `34143` and `34144` grant
  a subclass
- **AND** no other boss does

#### Scenario: Bosses are filtered by whether they grant a subclass

- **WHEN** a caller requests only the bosses that grant a subclass
- **THEN** those four are returned and no others

#### Scenario: An anonymous visitor sees it

- **WHEN** a request carrying no credentials asks for the boss list
- **THEN** each boss carries whether it grants a subclass, without a second
  request per boss

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

### Requirement: The catalogue is readable without authentication and writable only by operators

Reading any catalogue record SHALL succeed for a caller presenting no
credentials, because the catalogue describes the game rather than any
community's records.

Creating, changing or deleting a catalogue record SHALL be refused over the
public interface for every caller, authenticated or not. The catalogue is
maintained through the administration panel and the seed.

#### Scenario: An anonymous visitor reads the boss list

- **WHEN** a request carrying no credentials asks for the boss list
- **THEN** the bosses are returned

#### Scenario: An anonymous visitor reads one boss with its relations

- **WHEN** a request carrying no credentials asks for a boss by slug together
  with its location, drops and imagery
- **THEN** all of it is returned

#### Scenario: An anonymous visitor reads what one boss drops

- **WHEN** a reader in the boss list asks what a single boss drops
- **THEN** that boss's drops are returned with each item's grade, icon, name,
  count range and chance, without the drops of any other boss

#### Scenario: A write is refused

- **WHEN** any caller attempts to create, change or delete a catalogue record
  over the public interface
- **THEN** the request is refused

### Requirement: The catalogue is present from initialisation and survives correction

A newly initialised database SHALL contain the full catalogue. Running the seed
again over a database that already holds it SHALL leave one record per subject
rather than a second copy, matching records by their stable identifiers.

Corrections made by an operator after seeding SHALL be capturable back into the
seed's source, so that the next initialisation reproduces the corrected
catalogue rather than the derived one. What is captured SHALL be the
disagreements only: a value the rules would produce again says nothing, and
recording it would pin that record against a later change to those rules.

#### Scenario: A fresh database is seeded

- **WHEN** the seed runs against an empty database
- **THEN** the catalogue's bosses, locations, items, drops, grades and imagery
  are present

#### Scenario: Seeding twice does not duplicate

- **WHEN** the seed runs a second time against an already-seeded database
- **THEN** the record counts are unchanged
- **AND** no image is uploaded a second time

#### Scenario: Hand-set grades are captured and reproduced

- **WHEN** an operator changes several bosses' grades and the catalogue is
  exported back to the seed source
- **AND** the seed is then run against a fresh database
- **THEN** those bosses hold the operator's grades, not the derived ones

#### Scenario: Grades that agree with the rules are not recorded

- **WHEN** the catalogue is exported with every grade as the rules derived it
- **THEN** nothing is written for any of them

### Requirement: A revised source is applied in place

The source the catalogue is seeded from SHALL be replaceable by a corrected or
more complete revision of itself without stranding what is already stored.
Seeding after such a revision SHALL match each subject by its stable identifier
and update the stored record in place, and SHALL create a record only for a
subject the revision genuinely adds.

A revision SHALL account for every subject the previous source produced. Where a
revision states the same subject under a different spelling, the spelling SHALL
be reconciled to the stored one before seeding: the stable identifier is derived
from it, so an unreconciled spelling creates a second record instead of
correcting the first.

An image that a revision stops referencing SHALL be left in the media library
rather than removed. Nothing distinguishes an image the catalogue has abandoned
from one an operator uploaded for their own use, and the cost of keeping it is a
file.

#### Scenario: A revision that adds subjects

- **WHEN** the seed runs over an already-seeded database from a revision
  carrying bosses, items and drops the previous source did not
- **THEN** the added subjects become new records
- **AND** every subject the previous source produced still holds exactly one
  record

#### Scenario: Values the revision corrects are applied

- **WHEN** a revision gives a boss a different level or different world
  coordinates, or gives a drop a different chance or quantity range
- **THEN** reading the record back yields the revised values rather than the
  ones seeded before

#### Scenario: A renamed subject does not become a second record

- **WHEN** a revision would state a stored subject under a spelling that derives
  a different stable identifier
- **THEN** it is reconciled to the stored spelling before seeding, so the
  subject keeps one record

#### Scenario: An image no longer referenced is kept

- **WHEN** a revision points an item at a different icon
- **THEN** the item reports the new icon
- **AND** the icon it previously used remains in the media library

### Requirement: Every catalogue record names itself to an operator

A catalogue record SHALL identify itself by something a person can read wherever
the administration panel shows it — in its own list, and in the picker of every
relation that points at it. An internal identifier SHALL NOT stand in for that
name.

This is what makes the catalogue maintainable by hand at all. A drop is chosen
by naming a boss and an item; an avatar is chosen by recognising which one it
is. A list of opaque identifiers is not a slower way of doing that, it is no way
of doing it.

Two records have nothing obvious to be named by, and each SHALL carry one:

- a **drop** joins two records and holds only numbers of its own, so it SHALL
  carry a label naming the boss and the item it joins, kept in step with them;
- an **avatar** is a pair of images, so it SHALL be named by its slug, which is
  also the name of the image files behind it.

A **location** SHALL state whether it has a dungeon plan, as a value of its own
rather than only as the plan's presence. Some locations have a plan and the rest
do not, and which is which SHALL be answerable from the list —
including by filtering it — without opening each location in turn. The value
SHALL follow the plan: setting one or removing it changes the answer.

#### Scenario: An avatar is chosen by name in a boss

- **WHEN** an operator opens a boss and looks at the avatar relation
- **THEN** the avatar is shown by its slug rather than by an internal
  identifier

#### Scenario: A drop names the boss and the item it joins

- **WHEN** an operator opens the drop list
- **THEN** each drop is shown by a label naming its boss and its item

#### Scenario: A boss is chosen by name rather than by its game id

- **WHEN** an operator opens a drop and looks at the boss relation
- **THEN** the boss is shown by its name

#### Scenario: A drop's label follows the records it joins

- **WHEN** a drop is created or its boss or item is changed
- **THEN** its label names the boss and item it now joins

#### Scenario: A drop attached from inside a boss is named and checked

- **WHEN** a drop is created without a boss and then attached to one by editing
  that boss
- **THEN** its label names that boss and its item
- **AND** the attachment is refused if it would give the boss a second drop for
  an item it already drops

#### Scenario: Renaming a boss renames its drops

- **WHEN** a boss is renamed
- **THEN** the labels of its drops name it by its new name

#### Scenario: Locations with a plan can be told apart in the list

- **WHEN** an operator lists the locations
- **THEN** each says whether it has a dungeon plan
- **AND** the list can be narrowed to only those that have one

#### Scenario: Removing a plan changes the answer

- **WHEN** a location's dungeon plan is removed
- **THEN** it stops saying it has one

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

