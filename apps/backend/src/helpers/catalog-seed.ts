/**
 * Loads the raid-boss catalogue into the database, and is expected to be run
 * more than once: grades are seeded at their default and set by hand
 * afterwards, so every step below matches on a stable key and updates rather
 * than inserts a second copy.
 *
 * Runs through the Document Service rather than SQL so the lifecycles apply —
 * the boss-and-item pair check above all, which is the only thing enforcing
 * that constraint.
 *
 * Order is dependency order and not negotiable: grades, then locations and
 * avatars and items (each with its imagery), then bosses, then drops.
 *
 * Slugs are set explicitly at every step. Strapi generates a `uid` from its
 * `targetField` only in the admin panel — `POST /uid/generate` is an admin
 * route — so a record written from here with no slug simply gets none, and
 * nothing notices until something tries to address it.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Core } from '@strapi/strapi';

import {
  type CatalogSource,
  DEFAULT_GRADE_CODE,
  GRADES,
  IMAGES_ROOT,
  readCatalogGrades,
  readCatalogSource,
  WEAPON_TYPES,
} from './catalog-source';

const FILE_UID = 'plugin::upload.file';

export interface SeedReport {
  grades: number;
  weaponTypes: number;
  locations: number;
  avatars: number;
  items: number;
  bosses: number;
  drops: number;
  uploaded: number;
  reused: number;
}

/**
 * The name a source image is stored under, built from its path below
 * `mocks/raid-bosses/images/` rather than its filename.
 *
 * The filename alone is not unique: every avatar exists twice under the same
 * name, once in `avatars/full/` and once in `avatars/mini/`. Keying on it made
 * the miniature look like a file already uploaded, so all 96 of them resolved
 * to the full-size image and every boss got the same picture twice — 471 files
 * where 567 were expected, which is how it was caught. Including the folders
 * makes the name unique and says what the file is in the media library.
 */
const uploadNameFor = (filePath: string) =>
  path.relative(IMAGES_ROOT, filePath).split(path.sep).join('-');

/**
 * Uploads one image unless a file of that name is already there.
 *
 * Strapi does not deduplicate: the same bytes uploaded twice become two rows
 * and two files on disk. Without this check a second seed run would add another
 * 567 files, and every record would end up pointing at the newest copy while
 * the older ones lingered unreferenced — which is exactly the orphan pile this
 * change had to clear out in the first place.
 */
const uploadOnce = async (
  strapi: Core.Strapi,
  filePath: string,
  cache: Map<string, number>,
  counters: { uploaded: number; reused: number },
): Promise<number> => {
  const name = uploadNameFor(filePath);

  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const existing = await strapi.db.query(FILE_UID).findOne({ where: { name } });
  if (existing) {
    cache.set(name, existing.id);
    counters.reused += 1;
    return existing.id;
  }

  const stats = fs.statSync(filePath);
  const [uploaded] = await strapi
    .plugin('upload')
    .service('upload')
    .upload({
      data: {},
      files: {
        filepath: filePath,
        originalFilename: name,
        mimetype: 'image/webp',
        size: stats.size,
      },
    });

  cache.set(name, uploaded.id);
  counters.uploaded += 1;
  return uploaded.id;
};

/** Creates or updates one record, matched on a field that never changes. */
const upsert = async (
  strapi: Core.Strapi,
  uid: Parameters<Core.Strapi['documents']>[0],
  where: Record<string, unknown>,
  data: Record<string, unknown>,
) => {
  const existing = await strapi.db.query(uid).findOne({ where });

  if (existing) {
    return strapi.documents(uid).update({
      documentId: existing.documentId,
      data: data as never,
    });
  }

  return strapi.documents(uid).create({ data: data as never });
};

export const seedCatalog = async (
  strapi: Core.Strapi,
  source: CatalogSource = readCatalogSource(),
): Promise<SeedReport> => {
  const counters = { uploaded: 0, reused: 0 };
  const fileCache = new Map<string, number>();

  // 1. Grades. Everything else points at one, so they go first.
  const gradeIds = new Map<string, string>();
  for (const grade of GRADES) {
    const record = await upsert(strapi, 'api::grade.grade', { code: grade.code }, grade);
    gradeIds.set(grade.code, record.documentId);
  }

  // Hand-set grades win; where nobody has said otherwise the derived one
  // applies — a boss's from its level, an item's from the bosses that drop it
  // when they agree. `DEFAULT_GRADE_CODE` is the last resort, and after this
  // change it is reached only by the 14 items whose sources span bands.
  const chosen = readCatalogGrades();
  const gradeFor = (kind: 'bosses' | 'items', slug: string, derived: string) =>
    gradeIds.get(chosen[kind][slug] ?? derived) ?? gradeIds.get(DEFAULT_GRADE_CODE);

  // 2. Weapon types. Six records the bosses point at, rather than a label
  // repeated beside each of the 122 usages.
  const weaponIds = new Map<string, string>();
  for (const weapon of WEAPON_TYPES) {
    const record = await upsert(
      strapi,
      'api::weapon-type.weapon-type',
      { code: weapon.code },
      weapon,
    );
    weaponIds.set(weapon.code, record.documentId);
  }

  // 3. Locations, with the 15 dungeon plans that have one.
  const locationIds = new Map<string, string>();
  for (const location of source.locations) {
    const dungeon = location.dungeon
      ? {
          image: await uploadOnce(strapi, location.dungeon.imagePath, fileCache, counters),
          mapX: location.dungeon.mapX,
          mapY: location.dungeon.mapY,
          width: location.dungeon.width,
          height: location.dungeon.height,
        }
      : null;

    const record = await upsert(
      strapi,
      'api::location.location',
      { slug: location.slug },
      // `hasDungeon` is what the admin list can actually show; the lifecycle
      // would set the same value from `dungeon`, and it is passed explicitly so
      // a seeded location does not depend on that to be right.
      { slug: location.slug, name: location.name, dungeon, hasDungeon: dungeon !== null },
    );
    locationIds.set(location.slug, record.documentId);
  }

  // 4. Avatars. 96 of them serve 158 bosses, which is the whole reason they are
  // a type rather than two media fields on the boss.
  const avatarIds = new Map<string, string>();
  for (const avatar of source.avatars) {
    const record = await upsert(
      strapi,
      'api::avatar.avatar',
      { slug: avatar.slug },
      {
        slug: avatar.slug,
        full: await uploadOnce(strapi, avatar.fullPath, fileCache, counters),
        mini: await uploadOnce(strapi, avatar.miniPath, fileCache, counters),
      },
    );
    avatarIds.set(avatar.slug, record.documentId);
  }

  // 5. Items. 896 of them share 451 icons; `iconKey` is the source's `itemId`,
  // which names the icon and never the item.
  const itemIds = new Map<string, string>();
  for (const item of source.items) {
    const iconPath = item.iconKey ? source.icons.get(item.iconKey) : undefined;

    const record = await upsert(
      strapi,
      'api::item.item',
      { slug: item.slug },
      {
        slug: item.slug,
        name: item.name,
        grade: gradeFor('items', item.slug, item.grade),
        icon: iconPath ? await uploadOnce(strapi, iconPath, fileCache, counters) : null,
      },
    );
    itemIds.set(item.name, record.documentId);
  }

  // 6. Bosses.
  const bossIds = new Map<string, string>();
  const bossNames = new Map<string, string>(source.bosses.map((boss) => [boss.slug, boss.name]));
  for (const boss of source.bosses) {
    const record = await upsert(
      strapi,
      'api::raid-boss.raid-boss',
      { slug: boss.slug },
      {
        slug: boss.slug,
        gameId: boss.gameId,
        name: boss.name,
        race: boss.race,
        level: boss.level,
        epic: boss.epic,
        subclass: boss.subclass,
        saMaxLevel: boss.saMaxLevel,
        mapX: boss.mapX,
        mapY: boss.mapY,
        worldX: boss.worldX,
        worldY: boss.worldY,
        respawn: {
          kind: boss.respawn.kind,
          baseMinutes: boss.respawn.baseMinutes,
          varianceMinutes: boss.respawn.varianceMinutes,
        },
        // The three epics are scheduled but the source names no day, so the
        // list is empty on purpose rather than absent.
        respawnSchedule: [],
        stats: boss.stats,
        resistances: boss.resistances.map((code) => weaponIds.get(code)).filter(Boolean),
        vulnerabilities: boss.vulnerabilities.map((code) => weaponIds.get(code)).filter(Boolean),
        elementModifiers: boss.elementModifiers,
        statModifiers: boss.statModifiers,
        location: locationIds.get(boss.locationSlug),
        avatar: avatarIds.get(boss.avatarSlug),
        grade: gradeFor('bosses', boss.slug, boss.grade),
      },
    );
    bossIds.set(boss.slug, record.documentId);
  }

  // 7. Drops. Matched on the pair, which the lifecycle also refuses to
  // duplicate — so a re-run updates the chance rather than being rejected.
  for (const drop of source.drops) {
    const raidBoss = bossIds.get(drop.bossSlug);
    const item = itemIds.get(drop.itemName);
    if (!raidBoss || !item) continue;

    await upsert(
      strapi,
      'api::boss-drop.boss-drop',
      { raidBoss: { documentId: raidBoss }, item: { documentId: item } },
      {
        raidBoss,
        item,
        // Set here rather than left to the lifecycle. It would compute the same
        // string, but from two lookups per row — 7222 of them across the whole
        // catalogue, for names already in hand.
        label: `${bossNames.get(drop.bossSlug)} — ${drop.itemName}`,
        chance: drop.chance,
        minCount: drop.minCount,
        maxCount: drop.maxCount,
      },
    );
  }

  // The world map is not attached to any record yet — the map screen is a later
  // change — but it is part of the catalogue's imagery and belongs in the
  // library with the rest.
  await uploadOnce(strapi, source.worldMapPath, fileCache, counters);

  return {
    grades: GRADES.length,
    weaponTypes: WEAPON_TYPES.length,
    locations: source.locations.length,
    avatars: source.avatars.length,
    items: source.items.length,
    bosses: source.bosses.length,
    drops: source.drops.length,
    ...counters,
  };
};
