# raid-boss-catalog Specification

## Purpose
Holds the game's raid-boss reference data — bosses, where they stand, what they
drop and when they return — as queryable records rather than a frontend
constant, and makes it readable by any visitor, since it describes the game
world rather than any one community's records.

## Requirements

### Requirement: The catalogue holds bosses, locations, items and drops

The catalogue SHALL consist of four related record kinds:

- a **boss**, carrying its display name, the game's own numeric identifier, its
  race, its level, whether it is epic, whether it grants a subclass, its
  position on the world map and in world coordinates, and its respawn
  information;
- a **location**, carrying a display name and, where one exists, a dungeon plan
  with the plan image and the rectangle it occupies on the world map;
- an **item**, carrying a display name and a grade;
- a **drop**, joining one boss to one item and carrying the drop chance and the
  minimum and maximum quantity.

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

- **WHEN** a drop is stored with a chance of `38.7833`
- **THEN** reading it back yields `38.7833`, not a rounded value

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

### Requirement: Grade is one ordered vocabulary shared by bosses and items

Grade SHALL be a set of records shared by bosses and items rather than a
per-record list of permitted values, so that adding a grade is a single edit and
so that records can be sorted into game order.

Each grade SHALL carry a code, a display label and a rank. The rank SHALL order
the grades weakest-first: `NG`, `D`, `C`, `B`, `A`, `S`. Sorting bosses or items
by grade SHALL follow that rank and not the alphabetical order of the labels.

Every boss and every item SHALL carry a grade. Rather than defaulting the whole
catalogue to the weakest, a grade SHALL be derived where the catalogue already
implies one:

- a **boss** takes its grade from its level, in bands the operator chose;
- an **item** takes the grade it states in its own name where it states one,
  and otherwise the grade of the bosses that drop it, but only when they agree.
  Where neither settles it the item SHALL keep the default rather than be
  guessed, and those items SHALL be identifiable rather than silently averaged.

A grade set by hand SHALL win over a derived one, and SHALL survive re-seeding.

#### Scenario: Items sort into game order

- **WHEN** a caller requests items sorted by grade ascending
- **THEN** they are ordered `NG`, `D`, `C`, `B`, `A`, `S`, not `A`, `B`, `C`,
  `D`, `NG`, `S`

#### Scenario: A grade is added without touching bosses or items

- **WHEN** an operator adds a grade with a rank placing it after `S`
- **THEN** it becomes assignable to both bosses and items
- **AND** no existing boss or item record changes

#### Scenario: A boss takes the grade its level implies

- **WHEN** the catalogue is seeded
- **THEN** a boss below level 40 holds `D`, one from 40 to 49 holds `C`, one
  from 50 to 61 holds `B`, and one at 62 or above holds `A`

#### Scenario: An item that names its own grade is taken at its word

- **WHEN** an item is called `Scroll: Enchant Armor (D-Grade)`
- **THEN** it holds `D`, whatever the bosses that drop it hold

#### Scenario: An item takes the grade of the bosses that drop it

- **WHEN** an item names no grade and every boss that drops it falls in the
  same band
- **THEN** the item holds that grade

#### Scenario: An item dropped across bands is not guessed at

- **WHEN** an item names no grade and is dropped by bosses of differing grades
- **THEN** it keeps the default grade
- **AND** it is reported as one whose grade could not be derived

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

### Requirement: Combat characteristics are recorded as open vocabularies

A boss SHALL carry its combat statistics — hit points, mana, experience, skill
points, physical and magical attack, physical and magical defence, accuracy and
evasion.

A boss MAY carry weapon affinities: any number of weapon types it resists and
any number it is vulnerable to. A weapon type SHALL be a record of the
catalogue, carrying a code and a display label, and the same record SHALL serve
every boss that names it — the label belongs to the weapon, not to each mention
of it by a boss, and is where a translation would go. A boss with
neither affinity SHALL be valid; most of the catalogue has neither.

A boss MAY carry element modifiers and stat modifiers, each a list of
name-and-value pairs where the value is a signed whole number. These are lists
rather than fixed fields so that a modifier for a statistic not yet seen in the
source needs no change to the record shape.

#### Scenario: A boss resists several weapon types

- **WHEN** a boss resists bow, dagger and spear
- **THEN** all three are returned as its resistances, each with its label

#### Scenario: One weapon type serves every boss that names it

- **WHEN** two bosses resist the same weapon type
- **THEN** both name the same record
- **AND** changing that record's label changes what both report

#### Scenario: A boss with no affinities

- **WHEN** a boss with neither resistances nor vulnerabilities is read
- **THEN** both lists are empty and the record is valid

#### Scenario: Bosses are filtered by weapon affinity

- **WHEN** a caller requests bosses vulnerable to `blunt`
- **THEN** only bosses carrying that vulnerability are returned

#### Scenario: A modifier for a new statistic

- **WHEN** a boss is given a stat modifier of `eva` at `10`
- **THEN** it is stored and returned alongside modifiers for other statistics

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

Boss avatars, item icons, dungeon plans and the world map SHALL be stored as
managed media, replaceable by an operator without a deployment.

An avatar SHALL be a pair of images, a full-size and a miniature, held together
so the pair cannot drift apart, and SHALL be shareable by any number of bosses:
the catalogue has fewer distinct appearances than bosses. An icon SHALL likewise
be shareable by any number of items.

Replacing a shared image SHALL take effect for every record that references it.

#### Scenario: Many bosses share one avatar

- **WHEN** several bosses reference the same avatar
- **THEN** each returns both the full-size and the miniature image

#### Scenario: Replacing a shared avatar reaches every boss

- **WHEN** an operator replaces the images of an avatar shared by several bosses
- **THEN** every one of those bosses returns the replacement

#### Scenario: An item without an icon

- **WHEN** an item has no icon
- **THEN** it is still valid and readable

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

### Requirement: Source defects are corrected on the way in

The scraped source the catalogue is built from contains defects that SHALL NOT
reach the catalogue. Where the source failed to produce a location identifier
and collapsed distinct places under one placeholder, each place SHALL be a
location of its own with its own name and slug.

#### Scenario: The collapsed locations are distinct

- **WHEN** the catalogue is read
- **THEN** Eastern Border Outpost and Lachik Habitat are two locations with
  distinct slugs
- **AND** no location carries the source's placeholder identifier
