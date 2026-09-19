/**
 * A weapon kind a boss resists or is vulnerable to. A record rather than an
 * enumeration on the boss: the label is stored once for all 120 usages, and is
 * where a translation would go.
 */
export interface WeaponType {
  documentId: string;
  code: string;
  label: string;
}

export type Element = 'holy' | 'dark' | 'earth' | 'wind' | 'fire' | 'water';

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
  worldX: number;
  worldY: number;
  respawn: Respawn | null;
  respawnSchedule: RespawnEntry[];
  stats: BossStats | null;
  resistances: WeaponType[];
  vulnerabilities: WeaponType[];
  elementModifiers: { element: Element; value: number }[];
  statModifiers: { stat: string; value: number }[];
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
