export interface RaidBossDrop {
  itemId: string;
  name: string;
  /**
   * The item's grade, as the source states it beside the item's own name:
   * `ng`, `d`, `c`, `b` or `a`.
   *
   * A property of the item rather than of this row — every row naming an item
   * states the same grade — but stored here because this is where the source
   * publishes it. The catalogue used to infer it instead, from the levels of
   * the bosses that drop a thing, and got 500 of 850 items wrong.
   */
  grade: string;
  chance: number;
  minCount: number;
  maxCount: number;
  /** null for a handful of rare items (spellbooks, epic jewelry) the source itself has no icon for. */
  icon: string | null;
}

export interface RaidBossLocation {
  name: string;
  slug: string;
}

export interface RaidBossStats {
  hp: number;
  mp: number;
  exp: number;
  sp: number;
  pAtk: number;
  mAtk: number;
  pDef: number;
  mDef: number;
  acc: number;
  eva: number;
}

export interface RaidBossRespawn {
  raw: string;
  fixed: boolean;
  base: string | null;
  variance: string | null;
  baseHours: number | null;
  varianceHours: number | null;
}

export interface RaidBossAvatar {
  full: string;
  mini: string;
}

/**
 * A boss's drops, keyed by the game's own numeric id.
 *
 * Kept beside the bosses rather than inside them for two reasons. They are four
 * fifths of the data — 30,400 lines against 8,100 — and holding them here makes
 * the boss file something a person can read. And they are refreshed by a
 * different pass: drops come from one article request, everything else from one
 * request per boss, so the file boundary is the update boundary.
 *
 * Keyed on the id and not the slug. Slugs have changed twice in this
 * catalogue's life; ids are what the source itself treats as identity.
 */
export type RaidBossDrops = Record<string, RaidBossDrop[]>;

export interface RaidBossInfo {
  id: string;
  slug: string;
  name: string;
  race: string;
  level: number;
  epic: boolean;
  /** Whether killing this boss grants a subclass. True for four bosses; see the catalogue spec. */
  subclass: boolean;
  locations: RaidBossLocation[];
  avatar: RaidBossAvatar;
  mapX: number;
  mapY: number;
  /**
   * Where the boss's pin sits on the source's own 3004-pixel map — not a world
   * coordinate, which is what these were called until it was checked. The pair
   * stored for Queen Ant, `1557.91 / 2527.95`, is that pin's `left` and `top`
   * exactly. `mapX`/`mapY` locate the same boss on a different map, at a
   * different resolution; the two spaces are not interchangeable.
   */
  wikiX: number;
  wikiY: number;
  respawn: RaidBossRespawn;
  stats: RaidBossStats;
  /**
   * The skills the boss carries, as `<group>-<level>` keys into `SKILLS` in
   * `./skills.ts` — `4416-12` is the racial trait for Bugs.
   *
   * What a boss resists and is vulnerable to is read from these rather than
   * stored beside them: the values belong to the skill and are identical for
   * every boss that has it, so a rebalance is one edit instead of one per boss.
   *
   * They replaced four fields that said the same thing in a lossier shape —
   * two lists of weapon names and two maps of whole numbers. Checked before
   * those were removed: the skills reproduce every element and statistic
   * modifier exactly and every weapon affinity on 157 of the 158 bosses. The
   * one exception is where the old fields contradicted themselves, giving two
   * Dragons opposite affinities to the bow while five more carried none at all.
   */
  skills: string[];
  saMaxLevel?: number;
}

/**
 * One thing a skill shifts about a fight.
 *
 * The amount is signed — positive resists, negative is vulnerable to — and the
 * unit says how to read it. `percent` and `flat` are stated by the source.
 * `level` is the skill's own level, used where the source names a direction and
 * publishes no magnitude at all: `Dagger/Rapier Resistance` reads the same
 * sentence at level 1, 2 and 3. Amounts add up only within one unit, and
 * amounts in `level` compare only within one skill.
 */
export interface SkillModifier {
  kind: 'weapon' | 'element' | 'stat' | 'condition';
  subject: string;
  value: number;
  unit: 'percent' | 'flat' | 'level';
}

/**
 * A skill a boss carries, shared by every boss that carries it.
 *
 * `origin` is what lets a reader rank two skills that disagree about the same
 * subject: what a boss is told about itself outweighs what it is told about its
 * race. One boss in the catalogue needs that — see `scripts/catalogue/parse-skills.js`.
 */
export interface SkillInfo {
  /** `<group>-<level>`, which is what `RaidBossInfo.skills` holds. */
  key: string;
  group: string;
  level: number;
  name: string;
  origin: 'racial' | 'armor' | 'personal';
  /** Icon key, resolved against `images/skill-icons`. */
  icon: string | null;
  modifiers: SkillModifier[];
}

/**
 * What the reference states about the *other* game server, kept because it
 * costs nothing: the shared article embeds that server's level badges and stat
 * tables alongside both servers' drop tables, so one request describes both.
 *
 * Deliberately not `RaidBossInfo`. Only the fields below are stated for the
 * other server; everything else a boss carries — accuracy and evasion, the
 * soul-crystal level, respawn, location, coordinates, imagery, skills — would
 * have to be fetched per boss, and filling them from this server's values would
 * quietly pass one server's numbers off as the other's. Measured, the two
 * disagree on level, on every statistic here, on the soul-crystal level and on
 * the drops; they agree on race, on elemental attributes and on skills.
 */
export interface GammaBossInfo {
  id: string;
  name: string;
  level: number;
  stats: Omit<RaidBossStats, 'acc' | 'eva'>;
  drops: RaidBossDrop[];
}

export interface DungeonPlan {
  name: string;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
  image: string;
}
