export type Weapon = 'blunt' | 'bow' | 'dagger' | 'fist' | 'spear' | 'sword';

export type Element = 'holy' | 'dark' | 'earth' | 'wind' | 'fire' | 'water';

/**
 * What the six weapons are called on screen.
 *
 * Here rather than in the catalogue. These were records of their own until the
 * skills arrived, so that the label was stored once; with elements and
 * statistics named in the client already, a record per weapon left weapons the
 * only affinity with a table behind it and bought nothing.
 */
export const WEAPON_LABELS: Record<Weapon, string> = {
  blunt: 'Дубина',
  bow: 'Лук',
  dagger: 'Кинжал',
  fist: 'Кастет',
  spear: 'Копьё',
  sword: 'Меч',
};

/**
 * How to read a modifier's amount. `percent` and `flat` are stated by the
 * source; `level` is the skill's own level, carried where the source names a
 * direction and publishes no magnitude — `Dagger/Rapier Resistance` reads the
 * same sentence at every level. Amounts add up only within one unit, and
 * amounts in `level` compare only within one skill.
 */
export type ModifierUnit = 'percent' | 'flat' | 'level';

/**
 * A skill a boss carries, shared by every boss that carries it.
 *
 * One list per kind of subject, so that a weapon cannot arrive where an element
 * belongs. Amounts are signed: positive resists, negative is vulnerable to.
 *
 * `origin` is what ranks two skills that disagree about one subject — what a
 * boss is told about itself outweighs what it is told about its race.
 */
export interface Skill {
  documentId: string;
  key: string;
  label: string;
  gameId: string;
  level: number;
  name: string;
  origin: 'racial' | 'armor' | 'personal';
  icon: CatalogImage | null;
  weaponModifiers: { weapon: Weapon; value: number; unit: ModifierUnit }[];
  elementModifiers: { element: Element; value: number; unit: ModifierUnit }[];
  statModifiers: { stat: string; value: number; unit: ModifierUnit }[];
  conditionModifiers: { condition: string; value: number; unit: ModifierUnit }[];
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface CatalogImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface Grade {
  documentId: string;
  code: string;
  label: string;
  /** Weakest first. Sort by this, never by `label` — that sorts A before NG. */
  order: number;
}

export interface Dungeon {
  image: CatalogImage | null;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
}

export interface Location {
  documentId: string;
  slug: string;
  name: string;
  dungeon: Dungeon | null;
  /**
   * Mirrors `dungeon !== null`. It exists because the admin panel cannot render
   * or filter a component in a list; a reader here should use `dungeon`.
   */
  hasDungeon: boolean;
}

export interface Avatar {
  documentId: string;
  slug: string;
  full: CatalogImage | null;
  mini: CatalogImage | null;
}

export interface Respawn {
  /**
   * `interval` carries the two minute counts; `scheduled` carries neither and
   * uses `respawnSchedule` instead.
   */
  kind: 'interval' | 'scheduled';
  baseMinutes: number | null;
  varianceMinutes: number | null;
}

export interface RespawnEntry {
  weekday: Weekday;
  /** Wall-clock time on the game server, `HH:mm:ss.SSS`. */
  time: string;
}

export interface BossStats {
  hp: string;
  mp: string;
  exp: string;
  sp: string;
  pAtk: number;
  mAtk: number;
  pDef: number;
  mDef: number;
  acc: number;
  eva: number;
}

/**
 * The pictures a boss's coordinates are measured on.
 *
 * Two of them, because a boss carries two positions measured against two
 * different pictures: `mapX`/`mapY` on the hand-assembled one, which the
 * dungeon plans are also anchored to, and `wikiX`/`wikiY` on the source's own.
 * Each image carries its own `width` and `height`, which is the only place the
 * pixel basis for those coordinates lives — written down separately it could
 * disagree with the image it describes.
 */
export interface Maps {
  map: CatalogImage | null;
  wikiMap: CatalogImage | null;
}

export interface RaidBoss {
  documentId: string;
  slug: string;
  gameId: string;
  name: string;
  race: string;
  level: number;
  epic: boolean;
  subclass: boolean;
  saMaxLevel: number | null;
  mapX: number;
  mapY: number;
  wikiX: number;
  wikiY: number;
  respawn: Respawn | null;
  respawnSchedule: RespawnEntry[];
  stats: BossStats | null;
  /**
   * What makes this boss easier or harder to fight. Read from the skills rather
   * than copied onto the boss: the values belong to the skill and are the same
   * for every boss carrying it, so a rebalance is one record.
   */
  skills: Skill[];
  location: Location | null;
  avatar: Avatar | null;
  grade: Grade | null;
}

export interface CatalogItem {
  documentId: string;
  slug: string;
  name: string;
  grade: Grade | null;
  icon: CatalogImage | null;
}

export interface BossDrop {
  documentId: string;
  chance: number;
  minCount: number;
  maxCount: number;
  raidBoss: RaidBoss | null;
  item: CatalogItem | null;
}
