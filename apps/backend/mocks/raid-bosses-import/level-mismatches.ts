// Comparison of RAID_BOSS_ENTRIES (see ./raid-boss-entries.ts) against RAID_BOSSES in
// ../raid-bosses/data.ts, matched by name. Lists every match whose `level` differs between
// the two sources (49). Matched ids agree in all cases, so these look like the
// source having since been rebalanced/updated rather than a naming collision.

export interface LevelMismatch {
  id: number;
  name: string;
  apiLevel: number;
  raidBossesLevel: number;
}

export const LEVEL_MISMATCHES: LevelMismatch[] = [
  {
    id: 25131,
    name: 'Carnage Lord Gato',
    apiLevel: 52,
    raidBossesLevel: 50,
  },
  {
    id: 25217,
    name: 'Cursed Clara',
    apiLevel: 52,
    raidBossesLevel: 50,
  },
  {
    id: 25119,
    name: 'Messenger of Fairy Queen Berun',
    apiLevel: 52,
    raidBossesLevel: 50,
  },
  {
    id: 25460,
    name: 'Deadman Ereve',
    apiLevel: 53,
    raidBossesLevel: 51,
  },
  {
    id: 25067,
    name: 'Captain of Red Flag Shaka',
    apiLevel: 53,
    raidBossesLevel: 52,
  },
  {
    id: 25496,
    name: "Fafurion's Envoy Pingolpin",
    apiLevel: 53,
    raidBossesLevel: 52,
  },
  {
    id: 25029,
    name: 'Atraiban',
    apiLevel: 54,
    raidBossesLevel: 53,
  },
  {
    id: 25481,
    name: 'Magus Kenishee',
    apiLevel: 54,
    raidBossesLevel: 53,
  },
  {
    id: 25434,
    name: 'Bandit Leader Barda',
    apiLevel: 56,
    raidBossesLevel: 55,
  },
  {
    id: 25176,
    name: 'Black Lily',
    apiLevel: 56,
    raidBossesLevel: 55,
  },
  {
    id: 25493,
    name: "Eva's Spirit Niniel",
    apiLevel: 56,
    raidBossesLevel: 55,
  },
  {
    id: 25241,
    name: 'Harit Hero Tamash',
    apiLevel: 56,
    raidBossesLevel: 55,
  },
  {
    id: 25273,
    name: 'Carnamakos',
    apiLevel: 58,
    raidBossesLevel: 56,
  },
  {
    id: 25463,
    name: 'Harit Guardian Garangky',
    apiLevel: 59,
    raidBossesLevel: 56,
  },
  {
    id: 25122,
    name: 'Refugee Applicant Leo',
    apiLevel: 58,
    raidBossesLevel: 56,
  },
  {
    id: 25230,
    name: 'Timak Seer Ragoth',
    apiLevel: 59,
    raidBossesLevel: 57,
  },
  {
    id: 25089,
    name: 'Soulless Wild Boar',
    apiLevel: 60,
    raidBossesLevel: 59,
  },
  {
    id: 25407,
    name: 'Lord Ishka',
    apiLevel: 61,
    raidBossesLevel: 60,
  },
  {
    id: 25032,
    name: "Eva's Guardian Millenu",
    apiLevel: 64,
    raidBossesLevel: 62,
  },
  {
    id: 25179,
    name: 'Guardian of the Statue of Giant Karum',
    apiLevel: 64,
    raidBossesLevel: 62,
  },
  {
    id: 25226,
    name: 'Roaring Lord Kastor',
    apiLevel: 64,
    raidBossesLevel: 62,
  },
  {
    id: 25256,
    name: 'Taik High Prefect Arak',
    apiLevel: 64,
    raidBossesLevel: 62,
  },
  {
    id: 25238,
    name: 'Abyss Brukunt',
    apiLevel: 65,
    raidBossesLevel: 63,
  },
  {
    id: 25182,
    name: 'Demon Kuri',
    apiLevel: 65,
    raidBossesLevel: 63,
  },
  {
    id: 25234,
    name: 'Ancient Drake',
    apiLevel: 65,
    raidBossesLevel: 64,
  },
  {
    id: 25106,
    name: 'Ghost of the Well Lidia',
    apiLevel: 66,
    raidBossesLevel: 64,
  },
  {
    id: 25162,
    name: 'Giant Marpanak',
    apiLevel: 65,
    raidBossesLevel: 64,
  },
  {
    id: 25467,
    name: 'Gorgolos',
    apiLevel: 66,
    raidBossesLevel: 64,
  },
  {
    id: 25444,
    name: 'Enmity Ghost Ramdal',
    apiLevel: 67,
    raidBossesLevel: 65,
  },
  {
    id: 25125,
    name: 'Fierce Tiger King Angel',
    apiLevel: 66,
    raidBossesLevel: 65,
  },
  {
    id: 25255,
    name: 'Gargoyle Lord Tiphon',
    apiLevel: 67,
    raidBossesLevel: 65,
  },
  {
    id: 25140,
    name: 'Hekaton Prime',
    apiLevel: 67,
    raidBossesLevel: 65,
  },
  {
    id: 25051,
    name: 'Rahha',
    apiLevel: 66,
    raidBossesLevel: 65,
  },
  {
    id: 25478,
    name: "Shilen's Priest Hisilrome",
    apiLevel: 67,
    raidBossesLevel: 65,
  },
  {
    id: 25322,
    name: "Demon's Agent Falston",
    apiLevel: 68,
    raidBossesLevel: 66,
  },
  {
    id: 25470,
    name: 'Last Titan Utenus',
    apiLevel: 68,
    raidBossesLevel: 66,
  },
  {
    id: 25263,
    name: "Kernon's Faithful Servant Kelone",
    apiLevel: 68,
    raidBossesLevel: 67,
  },
  {
    id: 25073,
    name: 'Bloody Priest Rudelto',
    apiLevel: 70,
    raidBossesLevel: 69,
  },
  {
    id: 25233,
    name: 'Spirit of Andras, the Betrayer',
    apiLevel: 70,
    raidBossesLevel: 69,
  },
  {
    id: 25281,
    name: "Anakim's Nemesis Zakaron",
    apiLevel: 72,
    raidBossesLevel: 70,
  },
  {
    id: 25269,
    name: 'Beast Lord Behemoth',
    apiLevel: 72,
    raidBossesLevel: 70,
  },
  {
    id: 25198,
    name: "Fafurion's Herald Lokness",
    apiLevel: 71,
    raidBossesLevel: 70,
  },
  {
    id: 25453,
    name: 'Meanas Anor',
    apiLevel: 71,
    raidBossesLevel: 70,
  },
  {
    id: 25252,
    name: 'Palibati Queen Themis',
    apiLevel: 71,
    raidBossesLevel: 70,
  },
  {
    id: 25163,
    name: 'Roaring Skylancer',
    apiLevel: 71,
    raidBossesLevel: 70,
  },
  {
    id: 25447,
    name: 'Immortal Savior Mardil',
    apiLevel: 72,
    raidBossesLevel: 71,
  },
  {
    id: 25235,
    name: 'Vanor Chief Kandra',
    apiLevel: 73,
    raidBossesLevel: 72,
  },
  {
    id: 25199,
    name: 'Water Dragon Seer Sheshark',
    apiLevel: 73,
    raidBossesLevel: 72,
  },
  {
    id: 25109,
    name: 'Antharas Priest Cloe',
    apiLevel: 73,
    raidBossesLevel: 74,
  },
];
