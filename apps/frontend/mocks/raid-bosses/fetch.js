const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

const SOURCE_URL = 'https://giran.info/lu4/raidbosses/?server=Black';
const BASE_URL = 'https://giran.info';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const REQUEST_DELAY_MS = 120;

const ROOT_DIR = __dirname;
const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const DATA_FILE = path.join(ROOT_DIR, 'data.ts');
const FRONTEND_DIR = path.join(ROOT_DIR, '..', '..');

const STAT_MODIFIER_KEY_MAP = {
  pdef: 'pDef',
  mdef: 'mDef',
  patk: 'pAtk',
  matk: 'mAtk',
};

// giran.info has no icon at all for these rare/unique items (empty `i` in its own data — see
// buildBoss below). Icons sourced separately from masterwork.wiki; itemId is inferred from that
// site's filename convention (matches the pattern of every other item id in this dataset), not
// confirmed against giran.info's own code like the rest of this mock.
const MANUAL_ITEM_ICONS = {
  'Ancient Book: Divine Inspiration (Manuscript)':
    'https://masterwork.wiki/i64/etc_add_buffslot_i02.png',
  'Ancient Book: Divine Inspiration (Original Version)':
    'https://masterwork.wiki/i64/etc_add_buffslot_i03.png',
  'Earring of Orfen': 'https://masterwork.wiki/i64/accessory_earring_of_orfen_i00.png',
  'Magical Ring of Queen Ant': 'https://masterwork.wiki/i64/accessory_ring_of_queen_ant_i02.png',
  'Physical Ring of Queen Ant': 'https://masterwork.wiki/i64/accessory_ring_of_queen_ant_i00.png',
  'Ring of Core': 'https://masterwork.wiki/i64/accessory_ring_of_core_i00.png',
  "Spellbook: Archer's Will": 'https://masterwork.wiki/i64/archer_will_book.png',
  "Spellbook: Fighter's Will": 'https://masterwork.wiki/i64/br_spell_books_sword_i00.png',
  "Spellbook: Magician's Will": 'https://masterwork.wiki/i64/br_spell_books_magic_i00.png',
};

function itemIdFromManualIconUrl(url) {
  return path.basename(url, path.extname(url));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function extractScriptJson(html, id) {
  const re = new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`);
  const match = html.match(re);
  if (!match) {
    throw new Error(`Could not find <script id="${id}"> in the fetched page`);
  }
  return JSON.parse(match[1]);
}

function extractPlans(html) {
  const match = html.match(/var PLANS\s*=\s*(\{[\s\S]*?\});/);
  if (!match) {
    throw new Error('Could not find `var PLANS = {...}` in the fetched page');
  }
  return JSON.parse(match[1]);
}

const RESPAWN_RANGE_RE = /^(\d+)\s*hours?\s*±\s*(\d+)\s*hours?$/u;

function parseRespawn(raw) {
  if (raw === 'Fixed') {
    return { raw, fixed: true, base: null, variance: null, baseHours: null, varianceHours: null };
  }
  const match = raw.match(RESPAWN_RANGE_RE);
  if (!match) {
    throw new Error(`Unrecognized respawn format: ${JSON.stringify(raw)}`);
  }
  const baseHours = Number(match[1]);
  const varianceHours = Number(match[2]);
  return {
    raw,
    fixed: false,
    base: `PT${baseHours}H`,
    variance: `PT${varianceHours}H`,
    baseHours,
    varianceHours,
  };
}

function remapStatModifiers(obj) {
  if (!obj) return undefined;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[STAT_MODIFIER_KEY_MAP[key] || key] = value;
  }
  return result;
}

function remapElementModifiers(obj) {
  if (!obj) return undefined;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key.toLowerCase()] = value;
  }
  return result;
}

function buildBoss(raw, faceMap) {
  const faceName = faceMap[String(raw.id)] || 'unknown';
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    race: raw.race,
    level: raw.level,
    epic: raw.epic,
    locations: raw.locs.map((loc) => ({ name: loc.name, slug: loc.slug })),
    avatar: {
      full: `images/avatars/full/${faceName}.webp`,
      mini: `images/avatars/mini/${faceName}.webp`,
    },
    mapX: raw.x,
    mapY: raw.y,
    worldX: raw.gx,
    worldY: raw.gy,
    respawn: parseRespawn(raw.respawn),
    stats: {
      hp: raw.stats.hp,
      mp: raw.stats.mp,
      exp: raw.stats.exp,
      sp: raw.stats.sp,
      pAtk: raw.stats.p_atk,
      mAtk: raw.stats.m_atk,
      pDef: raw.stats.p_def,
      mDef: raw.stats.m_def,
      acc: raw.stats.acc,
      eva: raw.stats.eva,
    },
    weaponResistances: raw.wr || [],
    weaponVulnerabilities: raw.wv || [],
    elementModifiers: remapElementModifiers(raw.el),
    saMaxLevel: raw.sa,
    statModifiers: remapStatModifiers(raw.st),
    // the source itself has no icon for a handful of rare items (empty `i`) — matches the
    // site's own rendering, which shows no icon at all for those. MANUAL_ITEM_ICONS fills in
    // the ones we have a supplemental icon for; any other future case still falls back to null.
    drops: (raw.drops || []).map((drop) => {
      if (drop.i) {
        return {
          itemId: drop.i,
          name: drop.name,
          chance: drop.chance,
          minCount: drop.qmin,
          maxCount: drop.qmax,
          icon: `images/item-icons/${drop.i}.webp`,
        };
      }
      const manualIconUrl = MANUAL_ITEM_ICONS[drop.name];
      const itemId = manualIconUrl ? itemIdFromManualIconUrl(manualIconUrl) : '';
      return {
        itemId,
        name: drop.name,
        chance: drop.chance,
        minCount: drop.qmin,
        maxCount: drop.qmax,
        icon: itemId ? `images/item-icons/${itemId}.webp` : null,
      };
    }),
  };
}

function buildDungeonPlans(plans, usedSlugs) {
  const result = {};
  for (const slug of usedSlugs) {
    const plan = plans[slug];
    if (!plan) continue;
    result[slug] = {
      name: plan.n,
      mapX: plan.x,
      mapY: plan.y,
      width: plan.w,
      height: plan.h,
      image: `images/dungeon-plans/${plan.f}`,
    };
  }
  return result;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadImage(url, destPath, stats) {
  ensureDir(path.dirname(destPath));
  if (fs.existsSync(destPath)) {
    stats.skipped += 1;
    return;
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${res.statusText} — ${url}`);
    stats.failed += 1;
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  stats.downloaded += 1;
  await sleep(REQUEST_DELAY_MS);
}

async function downloadAndConvertToWebp(url, destPath, stats) {
  ensureDir(path.dirname(destPath));
  if (fs.existsSync(destPath)) {
    stats.skipped += 1;
    return;
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${res.statusText} — ${url}`);
    stats.failed += 1;
    return;
  }
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const webpBuffer = await sharp(sourceBuffer).webp().toBuffer();
  fs.writeFileSync(destPath, webpBuffer);
  stats.downloaded += 1;
  await sleep(REQUEST_DELAY_MS);
}

function writeDataFile(bosses, dungeonPlans) {
  const header = [
    '// Generated by mocks/raid-bosses/fetch.js — do not edit by hand.',
    `// Source: ${SOURCE_URL}`,
    `// Fetched: ${new Date().toISOString()}`,
    '// Re-run `pnpm --filter frontend fetch:raid-bosses` to regenerate.',
    '',
    "import type { DungeonPlan, RaidBossInfo } from './types';",
    '',
    "export const WORLD_MAP_IMAGE = 'images/world-map/map-c7.webp';",
    '',
    `export const RAID_BOSSES: RaidBossInfo[] = ${JSON.stringify(bosses, null, 2)};`,
    '',
    `export const DUNGEON_PLANS: Record<string, DungeonPlan> = ${JSON.stringify(dungeonPlans, null, 2)};`,
    '',
  ].join('\n');
  fs.writeFileSync(DATA_FILE, header);
}

function formatDataFile() {
  const relativePath = path.relative(FRONTEND_DIR, DATA_FILE);
  try {
    execFileSync('pnpm', ['exec', 'biome', 'format', '--write', relativePath], {
      cwd: FRONTEND_DIR,
      stdio: 'ignore',
    });
  } catch (err) {
    console.warn(`  ! Could not run biome format on ${relativePath}: ${err.message}`);
  }
}

async function main() {
  console.info(`Fetching ${SOURCE_URL} ...`);
  const html = await fetchText(SOURCE_URL);

  const rawBosses = extractScriptJson(html, 'rb-data');
  const faceMap = extractScriptJson(html, 'face-data');
  const plans = extractPlans(html);

  console.info(`Parsed ${rawBosses.length} bosses.`);

  const bosses = rawBosses.map((raw) => buildBoss(raw, faceMap));

  const usedSlugs = new Set();
  for (const boss of bosses) {
    for (const location of boss.locations) {
      usedSlugs.add(location.slug);
    }
  }
  const dungeonPlans = buildDungeonPlans(plans, usedSlugs);
  console.info(
    `Resolved ${Object.keys(dungeonPlans).length} dungeon plan images (of ${usedSlugs.size} used zones).`,
  );

  writeDataFile(bosses, dungeonPlans);
  console.info(`Wrote ${DATA_FILE}`);
  formatDataFile();

  const stats = { downloaded: 0, skipped: 0, failed: 0 };

  console.info('Downloading world map...');
  await downloadImage(
    `${BASE_URL}/img/map-c7.webp`,
    path.join(IMAGES_DIR, 'world-map', 'map-c7.webp'),
    stats,
  );

  const faceNames = new Set(bosses.map((b) => path.basename(b.avatar.full, '.webp')));
  console.info(`Downloading ${faceNames.size} boss avatars (full + mini)...`);
  for (const faceName of faceNames) {
    await downloadImage(
      `${BASE_URL}/faces/${faceName}.webp`,
      path.join(IMAGES_DIR, 'avatars', 'full', `${faceName}.webp`),
      stats,
    );
    await downloadImage(
      `${BASE_URL}/faces/mini/${faceName}.webp`,
      path.join(IMAGES_DIR, 'avatars', 'mini', `${faceName}.webp`),
      stats,
    );
  }

  console.info(`Downloading ${Object.keys(dungeonPlans).length} dungeon plan images...`);
  for (const plan of Object.values(dungeonPlans)) {
    const filename = path.basename(plan.image);
    await downloadImage(
      `${BASE_URL}/img/dungeons/${filename}`,
      path.join(IMAGES_DIR, 'dungeon-plans', filename),
      stats,
    );
  }

  const manualItemIds = new Set(Object.values(MANUAL_ITEM_ICONS).map(itemIdFromManualIconUrl));
  const itemIds = new Set();
  for (const boss of bosses) {
    for (const drop of boss.drops) {
      // manually-sourced icons (masterwork.wiki) are downloaded separately below — giran.info
      // never had these to begin with, so requesting them here would just 404.
      if (drop.itemId && !manualItemIds.has(drop.itemId)) itemIds.add(drop.itemId);
    }
  }
  console.info(`Downloading ${itemIds.size} drop item icons...`);
  for (const itemId of itemIds) {
    await downloadImage(
      `${BASE_URL}/icons/${itemId}.webp`,
      path.join(IMAGES_DIR, 'item-icons', `${itemId}.webp`),
      stats,
    );
  }

  const manualIconUrls = Object.values(MANUAL_ITEM_ICONS);
  console.info(
    `Downloading + converting ${manualIconUrls.length} supplemental item icons (PNG → WEBP)...`,
  );
  for (const url of manualIconUrls) {
    const itemId = itemIdFromManualIconUrl(url);
    await downloadAndConvertToWebp(
      url,
      path.join(IMAGES_DIR, 'item-icons', `${itemId}.webp`),
      stats,
    );
  }

  console.info(
    `Done. Images downloaded: ${stats.downloaded}, skipped (already present): ${stats.skipped}, failed: ${stats.failed}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
