// Entries from RAID_BOSSES in ../raid-bosses/data.ts that are absent from
// RAID_BOSS_ENTRIES (see ./raid-boss-entries.ts) (7).
// Note: all 7 of these do exist in the API response, just under a different
// `title` (Core/Orfen: "Epic Boss", Queen Ant: "Queen of Underground", the four elemental
// spirits: "Subclass Raid Boss") rather than "Raid Boss".

import type { ExistingRaidBossRef } from './types';

export const MISSING_FROM_NEW_SOURCE: ExistingRaidBossRef[] = [
  {
    id: '29006',
    slug: '29006-core',
    name: 'Core',
  },
  {
    id: '34143',
    slug: '34143-erdrath-earth-spirit',
    name: 'Erdrath, Earth Spirit',
  },
  {
    id: '34141',
    slug: '34141-kaldrak-fire-spirit',
    name: 'Kaldrak, Fire Spirit',
  },
  {
    id: '34142',
    slug: '34142-naerith-water-spirit',
    name: 'Naerith, Water Spirit',
  },
  {
    id: '29014',
    slug: '29014-orfen',
    name: 'Orfen',
  },
  {
    id: '29001',
    slug: '29001-queen-ant',
    name: 'Queen Ant',
  },
  {
    id: '34144',
    slug: '34144-zephrath-wind-spirit',
    name: 'Zephrath, Wind Spirit',
  },
];
