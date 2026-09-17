export interface RaidBossDrop {
  itemId: string;
  name: string;
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

export interface RaidBossInfo {
  id: string;
  slug: string;
  name: string;
  race: string;
  level: number;
  epic: boolean;
  locations: RaidBossLocation[];
  avatar: RaidBossAvatar;
  mapX: number;
  mapY: number;
  worldX: number;
  worldY: number;
  respawn: RaidBossRespawn;
  stats: RaidBossStats;
  weaponResistances: string[];
  weaponVulnerabilities: string[];
  elementModifiers?: Record<string, number>;
  saMaxLevel?: number;
  statModifiers?: Record<string, number>;
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
