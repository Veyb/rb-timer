// Shared types for the raid-boss import comparison in this folder.

export interface RaidBossApiEntry {
  crossMatch: boolean;
  kind: string;
  id: number;
  slug: string;
  name: string;
  title: string;
  grade: string | null;
  category: string;
  subtype: string;
  typeLine: string;
  level: number;
  race: string;
  icon: string;
  sourceCount: number;
  spawnCount: number;
  bestChance: number;
  bestFarmable: number;
  raidOnly: boolean;
  fusable: boolean;
  magic: boolean;
  reagentCarrier: boolean;
  reagentTier: number | null;
  elite: boolean;
  aggressive: boolean;
  stat: string | null;
  hasSpawn: boolean;
  isRaid: boolean;
  obtainable: boolean;
}

export interface ExistingRaidBossRef {
  id: string;
  slug: string;
  name: string;
}

// Shape of https://lu4-wiki.hatemosphe.re/api/npc/{id} responses (see ./raid-boss-details.ts),
// a different, more detailed endpoint than the search API RaidBossApiEntry mirrors above.

export interface RaidBossDetailSpawn {
  x: number;
  y: number;
}

export interface RaidBossDetailLocation {
  id: number;
  slug: string;
  name: string;
  nameSource: string;
}

export interface RaidBossDetailSkill {
  id: number;
  slug: string;
  level: number;
  name: string;
  icon: string;
  description: string | null;
}

export interface RaidBossDetailSoulCrystal {
  from: number;
  to: number;
  chance: number;
  icon: string;
}

/** Only the 6 keys observed anywhere in the fetched data; some entries omit `holy`. */
export type RaidBossDetailElementAttributes = Partial<
  Record<'fire' | 'water' | 'wind' | 'earth' | 'holy' | 'unholy', number>
>;

export interface RaidBossDetail {
  id: number;
  slug: string;
  name: string;
  title: string;
  race: string;
  level: number;
  icon: string;
  /** Raw display string, e.g. "6 hours ± 2 hours" — not parsed into hours/variance here. */
  respawn: string;
  respawn_seconds: number;
  hp: number;
  mp: number;
  patk: number;
  matk: number;
  pdef: number;
  mdef: number;
  acc: number;
  eva: number;
  exp: number;
  sp: number;
  atk_attr: string;
  /** 0 | 1, not a JSON boolean, unlike the same-named fields on RaidBossApiEntry. */
  has_spawn: 0 | 1;
  is_raid: 0 | 1;
  spawn_count: number;
  role: string;
  spawn_spread: number;
  reagent_carrier: 0 | 1;
  elite: 0 | 1;
  aggressive: 0 | 1;
  defAttributes: RaidBossDetailElementAttributes;
  skills: RaidBossDetailSkill[];
  /** Empty for the large majority; populated entries are [{ from, to, chance, icon }]. */
  soulCrystals: RaidBossDetailSoulCrystal[];
  spawns: RaidBossDetailSpawn[];
  locations: RaidBossDetailLocation[];
  /** Always null across every raid boss fetched so far. */
  reagents: null;
}

export interface RaidBossDetailTraitEntry {
  label: string;
  value: number | null;
  source: string;
}

export interface RaidBossDetailTraitCategory {
  weapon: RaidBossDetailTraitEntry[];
  element: RaidBossDetailTraitEntry[];
  damage: RaidBossDetailTraitEntry[];
  status: RaidBossDetailTraitEntry[];
}

export interface RaidBossDetailTraits {
  weak: RaidBossDetailTraitCategory;
  resist: RaidBossDetailTraitCategory;
  hasTactics: boolean;
}

export interface RaidBossDetailExp {
  base: number;
  penalty: number;
  premium: number;
  value: number;
}

export interface RaidBossDetailDropItem {
  id: number;
  slug: string;
  name: string;
  grade: string;
  category: string;
  subtype: string | null;
  icon: string;
}

export interface RaidBossDetailDrop {
  item: RaidBossDetailDropItem;
  min: number;
  max: number;
  chance: number;
  groupChance: number | null;
  effectiveChance: number;
  baseChance: number;
  penalty: number;
  premium: number;
  group: number | null;
}

export interface RaidBossDetailEntry {
  npc: RaidBossDetail;
  traits: RaidBossDetailTraits;
  exp: RaidBossDetailExp;
  drops: RaidBossDetailDrop[];
  /** Always empty across every raid boss fetched so far; item shape unconfirmed. */
  spoils: unknown[];
}
