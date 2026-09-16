// Covers the seeding half of specs/raid-boss-catalog: that a fresh database
// ends up holding the catalogue, that running the seed again leaves it where it
// was, and that the two things the source shape makes easy to get wrong — a
// shared avatar and a fractional drop chance — survive the round trip.
//
// Seeds a slice rather than all 153 bosses. `seedCatalog` takes the source as
// an argument for exactly this: the full run writes 2791 drops and uploads 567
// images, which is a minute of wall clock to prove something a handful of
// records proves just as well. The full run is exercised by `pnpm seed:catalog`
// against a real database.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportCatalogGrades } from '../src/helpers/catalog-export';
import { seedCatalog } from '../src/helpers/catalog-seed';
import { type CatalogSource, readCatalogSource } from '../src/helpers/catalog-source';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

let strapi: Core.Strapi;
let slice: CatalogSource;

/**
 * Two bosses that share an avatar, with everything they reference. Found rather
 * than hardcoded: 96 avatars serve 153 bosses, so a shared one always exists,
 * but which one is not something to freeze into a test.
 */
const takeSlice = (source: CatalogSource): CatalogSource => {
  const byAvatar = new Map<string, typeof source.bosses>();
  for (const boss of source.bosses) {
    byAvatar.set(boss.avatarSlug, [...(byAvatar.get(boss.avatarSlug) ?? []), boss]);
  }

  const shared = [...byAvatar.values()].find((group) => group.length > 1);
  if (!shared) throw new Error('expected at least one avatar shared by two bosses');

  const bosses = shared.slice(0, 2);
  const bossSlugs = new Set(bosses.map((boss) => boss.slug));
  const drops = source.drops.filter((drop) => bossSlugs.has(drop.bossSlug));
  const itemNames = new Set(drops.map((drop) => drop.itemName));
  const items = source.items.filter((item) => itemNames.has(item.name));
  const locationSlugs = new Set(bosses.map((boss) => boss.locationSlug));

  return {
    bosses,
    drops,
    items,
    locations: source.locations.filter((location) => locationSlugs.has(location.slug)),
    avatars: source.avatars.filter((avatar) => avatar.slug === bosses[0]?.avatarSlug),
    icons: source.icons,
    worldMapPath: source.worldMapPath,
    ambiguousItems: source.ambiguousItems,
  };
};

const counts = async () => ({
  grades: await strapi.db.query('api::grade.grade').count(),
  locations: await strapi.db.query('api::location.location').count(),
  avatars: await strapi.db.query('api::avatar.avatar').count(),
  items: await strapi.db.query('api::item.item').count(),
  bosses: await strapi.db.query('api::raid-boss.raid-boss').count(),
  drops: await strapi.db.query('api::boss-drop.boss-drop').count(),
  files: await strapi.db.query('plugin::upload.file').count(),
});

beforeAll(async () => {
  ({ strapi } = await setupStrapi());
  slice = takeSlice(readCatalogSource());
  await seedCatalog(strapi, slice);
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('seeding the catalogue', () => {
  it('writes the slice it was given', async () => {
    const after = await counts();

    expect(after.grades).toBe(6);
    expect(after.bosses).toBe(slice.bosses.length);
    expect(after.items).toBe(slice.items.length);
    expect(after.drops).toBe(slice.drops.length);
    expect(after.locations).toBe(slice.locations.length);
    expect(after.avatars).toBe(1);
  });

  it('gives every record a slug, since Strapi generates none outside the admin panel', async () => {
    for (const uid of [
      'api::raid-boss.raid-boss',
      'api::item.item',
      'api::location.location',
      'api::avatar.avatar',
    ] as const) {
      const records = await strapi.db.query(uid).findMany({ select: ['slug'] });

      expect(records.length).toBeGreaterThan(0);
      expect(records.every((record: { slug?: string }) => Boolean(record.slug))).toBe(true);
    }
  });

  it('points a boss at weapon-type records rather than repeating a label', async () => {
    const weapons = await strapi.db.query('api::weapon-type.weapon-type').findMany({});
    expect(weapons).toHaveLength(6);

    const withAffinity = slice.bosses.find(
      (boss) => boss.resistances.length > 0 || boss.vulnerabilities.length > 0,
    );
    if (!withAffinity) return;

    const [stored] = await strapi.db.query('api::raid-boss.raid-boss').findMany({
      where: { slug: withAffinity.slug },
      populate: { resistances: true, vulnerabilities: true },
    });

    const codes = (rows: { code: string }[]) => rows.map((row) => row.code).sort();

    expect(codes(stored.resistances)).toEqual([...withAffinity.resistances].sort());
    expect(codes(stored.vulnerabilities)).toEqual([...withAffinity.vulnerabilities].sort());
    // The label is on the record, once, not beside each of the 120 usages.
    expect(stored.resistances.every((row: { label: string }) => Boolean(row.label))).toBe(true);
  });

  it('orders grades weakest first rather than alphabetically', async () => {
    const grades = await strapi.db
      .query('api::grade.grade')
      .findMany({ orderBy: { order: 'asc' }, select: ['label'] });

    expect(grades.map((grade: { label: string }) => grade.label)).toEqual([
      'NG',
      'D',
      'C',
      'B',
      'A',
      'S',
    ]);
  });

  it('points both bosses at the one avatar they share, with a distinct full and mini', async () => {
    const avatars = await strapi.db
      .query('api::avatar.avatar')
      .findMany({ populate: { full: true, mini: true, raidBosses: true } });

    expect(avatars).toHaveLength(1);
    expect(avatars[0].raidBosses).toHaveLength(2);
    expect(avatars[0].full.id).not.toBe(avatars[0].mini.id);
    expect(avatars[0].full.name).not.toBe(avatars[0].mini.name);
  });

  it('keeps a fractional drop chance exactly', async () => {
    const fractional = slice.drops.find((drop) => !Number.isInteger(drop.chance));
    if (!fractional) return;

    const stored = await strapi.db
      .query('api::boss-drop.boss-drop')
      .findMany({ select: ['chance'] });

    expect(stored.map((drop: { chance: number }) => drop.chance)).toContain(fractional.chance);
  });

  it('names a seeded drop after the boss and the item it joins', async () => {
    const drops = await strapi.db
      .query('api::boss-drop.boss-drop')
      .findMany({ populate: { raidBoss: true, item: true } });

    expect(drops.length).toBeGreaterThan(0);

    for (const drop of drops as {
      label: string;
      raidBoss: { name: string };
      item: { name: string };
    }[]) {
      expect(drop.label).toBe(`${drop.raidBoss.name} — ${drop.item.name}`);
    }
  });

  // The three below are about the admin panel, where a drop is created and
  // edited by hand and arrives with no label at all.
  describe('a drop written without a label', () => {
    /** A boss-and-item pair the seeded slice does not already use. */
    const freePair = async () => {
      const [first, second] = slice.bosses;
      const firstItems = new Set(
        slice.drops.filter((drop) => drop.bossSlug === first?.slug).map((drop) => drop.itemName),
      );
      const spare = slice.drops.find(
        (drop) => drop.bossSlug === second?.slug && !firstItems.has(drop.itemName),
      );
      if (!spare || !first) return null;

      const boss = await strapi.db
        .query('api::raid-boss.raid-boss')
        .findOne({ where: { slug: first.slug } });
      const item = await strapi.db
        .query('api::item.item')
        .findOne({ where: { name: spare.itemName } });

      return boss && item ? { boss, item } : null;
    };

    it('is named after its ends', async () => {
      const pair = await freePair();
      if (!pair) return;

      const created = await strapi.documents('api::boss-drop.boss-drop').create({
        data: {
          raidBoss: pair.boss.documentId,
          item: pair.item.documentId,
          chance: 1,
          minCount: 1,
          maxCount: 1,
        },
      });

      expect(created.label).toBe(`${pair.boss.name} — ${pair.item.name}`);

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: created.documentId });
    });

    it('is renamed when only its item changes', async () => {
      const pair = await freePair();
      if (!pair) return;

      const created = await strapi.documents('api::boss-drop.boss-drop').create({
        data: {
          raidBoss: pair.boss.documentId,
          item: pair.item.documentId,
          chance: 1,
          minCount: 1,
          maxCount: 1,
        },
      });

      // A different item this boss does not already drop. The update names only
      // the item — the boss half has to be read off the row, which is the case
      // that used to skip both the rename and the duplicate check.
      const others = await strapi.db.query('api::item.item').findMany({ limit: 50 });
      const taken = await strapi.db
        .query('api::boss-drop.boss-drop')
        .findMany({ where: { raidBoss: { id: pair.boss.id } }, populate: { item: true } });
      const takenIds = new Set(taken.map((drop: { item?: { id: number } }) => drop.item?.id));
      const replacement = others.find((item: { id: number }) => !takenIds.has(item.id));
      if (!replacement) return;

      const updated = await strapi.documents('api::boss-drop.boss-drop').update({
        documentId: created.documentId,
        data: { item: replacement.documentId },
      });

      expect(updated?.label).toBe(`${pair.boss.name} — ${replacement.name}`);

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: created.documentId });
    });

    it('is still refused when only the item change would duplicate a pair', async () => {
      const pair = await freePair();
      if (!pair) return;

      const created = await strapi.documents('api::boss-drop.boss-drop').create({
        data: {
          raidBoss: pair.boss.documentId,
          item: pair.item.documentId,
          chance: 1,
          minCount: 1,
          maxCount: 1,
        },
      });

      // An item this boss already drops. The request names no boss, so the
      // check has to find the other half itself.
      const existing = await strapi.db.query('api::boss-drop.boss-drop').findOne({
        where: { raidBoss: { id: pair.boss.id }, id: { $ne: created.id } },
        populate: { item: true },
      });

      if (existing?.item) {
        await expect(
          strapi.documents('api::boss-drop.boss-drop').update({
            documentId: created.documentId,
            data: { item: existing.item.documentId },
          }),
        ).rejects.toThrow();
      }

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: created.documentId });
    });
  });

  /**
   * Writes a drop with a deliberately incomplete payload.
   *
   * `required: true` on the two relations reaches TypeScript — Strapi generates
   * `Schema.Attribute.Required`, and the create input demands both — so none of
   * the calls below type-check without this. That is the point rather than an
   * inconvenience: the type enforces what the runtime does not, and a script or
   * a raw HTTP request reaches the Document Service with exactly these shapes.
   * The cast is how a test says "as an untyped caller would".
   */
  const createDropUnchecked = (data: Record<string, unknown>) =>
    strapi.documents('api::boss-drop.boss-drop').create({ data: data as never });

  // `required: true` on a relation is an admin-form rule and nothing more —
  // with both relations marked required, the Document Service happily created a
  // drop with neither. So the one that must hold is checked in code.
  describe('a drop without an item', () => {
    it('is refused', async () => {
      await expect(createDropUnchecked({ chance: 1, minCount: 1, maxCount: 1 })).rejects.toThrow(
        /item/i,
      );
    });

    it('is refused when an update clears the item', async () => {
      const [existing] = await strapi.db.query('api::boss-drop.boss-drop').findMany({ limit: 1 });
      if (!existing) return;

      await expect(
        strapi
          .documents('api::boss-drop.boss-drop')
          .update({ documentId: existing.documentId, data: { item: null } }),
      ).rejects.toThrow(/item/i);
    });

    it('still allows a drop with no boss yet, which the boss end then attaches', async () => {
      const item = await strapi.db.query('api::item.item').findOne({});
      const loose = await createDropUnchecked({
        item: item.documentId,
        chance: 1,
        minCount: 1,
        maxCount: 1,
      });

      expect(loose.documentId).toBeTruthy();

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: loose.documentId });
    });
  });

  // Moderating from inside a boss: the drop is created first with no boss of
  // its own, and the link lands when the boss is saved. `boss-drop`'s own
  // lifecycle never sees a `raidBoss` on that path, so the raid boss's
  // lifecycle guards it from the other end.
  describe('a drop attached from inside a boss', () => {
    const makeLooseDrop = async (itemSlug: string) => {
      const item = await strapi.db.query('api::item.item').findOne({ where: { slug: itemSlug } });
      const drop = await createDropUnchecked({
        item: item.documentId,
        chance: 5,
        minCount: 1,
        maxCount: 1,
      });

      // Nothing to name it after yet — which is the whole reason for what follows.
      expect(drop.label).toBeFalsy();

      return drop;
    };

    it('is named once the boss it belongs to is saved', async () => {
      const [boss] = slice.bosses;
      const bossRecord = await strapi.db
        .query('api::raid-boss.raid-boss')
        .findOne({ where: { slug: boss?.slug } });

      const taken = await strapi.db
        .query('api::boss-drop.boss-drop')
        .findMany({ where: { raidBoss: { id: bossRecord.id } }, populate: { item: true } });
      const takenIds = new Set(taken.map((drop: { item?: { id: number } }) => drop.item?.id));
      const free = (await strapi.db.query('api::item.item').findMany({})).find(
        (item: { id: number }) => !takenIds.has(item.id),
      );
      if (!free) return;

      const loose = await makeLooseDrop(free.slug);

      await strapi.documents('api::raid-boss.raid-boss').update({
        documentId: bossRecord.documentId,
        data: { drops: { connect: [loose.documentId] } },
      });

      const named = await strapi.db
        .query('api::boss-drop.boss-drop')
        .findOne({ where: { documentId: loose.documentId } });

      expect(named.label).toBe(`${bossRecord.name} — ${free.name}`);

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: loose.documentId });
    });

    it('is refused when it would give the boss a second drop for one item', async () => {
      const [boss] = slice.bosses;
      const bossRecord = await strapi.db
        .query('api::raid-boss.raid-boss')
        .findOne({ where: { slug: boss?.slug } });

      const existing = await strapi.db
        .query('api::boss-drop.boss-drop')
        .findOne({ where: { raidBoss: { id: bossRecord.id } }, populate: { item: true } });
      if (!existing?.item) return;

      const clash = await makeLooseDrop(existing.item.slug);

      await expect(
        strapi.documents('api::raid-boss.raid-boss').update({
          documentId: bossRecord.documentId,
          data: { drops: { connect: [clash.documentId] } },
        }),
      ).rejects.toThrow(/already|once/i);

      await strapi.documents('api::boss-drop.boss-drop').delete({ documentId: clash.documentId });
    });

    it('follows the boss when it is renamed', async () => {
      const [boss] = slice.bosses;
      const bossRecord = await strapi.db
        .query('api::raid-boss.raid-boss')
        .findOne({ where: { slug: boss?.slug } });

      await strapi.documents('api::raid-boss.raid-boss').update({
        documentId: bossRecord.documentId,
        data: { name: 'Renamed Boss' },
      });

      const drops = await strapi.db
        .query('api::boss-drop.boss-drop')
        .findMany({ where: { raidBoss: { id: bossRecord.id } } });

      expect(drops.length).toBeGreaterThan(0);
      expect(
        drops.every((drop: { label: string }) => drop.label.startsWith('Renamed Boss — ')),
      ).toBe(true);

      await strapi.documents('api::raid-boss.raid-boss').update({
        documentId: bossRecord.documentId,
        data: { name: bossRecord.name },
      });
    });
  });

  // A single component renders as a dash in the admin list whatever it holds,
  // and cannot be filtered on, so "does this location have a plan" has to be a
  // value of its own.
  describe('the dungeon flag', () => {
    it('agrees with the plan on every seeded location', async () => {
      const locations = await strapi.db
        .query('api::location.location')
        .findMany({ populate: { dungeon: true } });

      expect(locations.length).toBeGreaterThan(0);

      for (const location of locations as { hasDungeon: boolean; dungeon: unknown }[]) {
        expect(location.hasDungeon).toBe(location.dungeon !== null);
      }
    });

    it('can be filtered on, which a component could not', async () => {
      const withPlan = await strapi.db
        .query('api::location.location')
        .findMany({ where: { hasDungeon: true } });
      const all = await strapi.db.query('api::location.location').findMany({});

      expect(withPlan.length).toBeLessThanOrEqual(all.length);
      expect(withPlan.every((location: { hasDungeon: boolean }) => location.hasDungeon)).toBe(true);
    });

    it('is raised when a plan is added and cleared when it is removed', async () => {
      const plain = await strapi.documents('api::location.location').create({
        data: { slug: 'tmp-flag-location', name: 'Tmp Flag Location' },
      });

      expect(plain.hasDungeon).toBe(false);

      const image = await strapi.db.query('plugin::upload.file').findOne({});
      if (image) {
        const withPlan = await strapi.documents('api::location.location').update({
          documentId: plain.documentId,
          data: {
            dungeon: { image: image.id, mapX: 1, mapY: 2, width: 3, height: 4 },
          },
        });

        expect(withPlan?.hasDungeon).toBe(true);

        const cleared = await strapi.documents('api::location.location').update({
          documentId: plain.documentId,
          data: { dungeon: null },
        });

        expect(cleared?.hasDungeon).toBe(false);
      }

      await strapi.documents('api::location.location').delete({ documentId: plain.documentId });
    });

    it('is left alone by an update that does not mention the plan', async () => {
      const [seeded] = await strapi.db
        .query('api::location.location')
        .findMany({ where: { hasDungeon: true }, limit: 1 });
      if (!seeded) return;

      const renamed = await strapi.documents('api::location.location').update({
        documentId: seeded.documentId,
        data: { name: `${seeded.name} (touched)` },
      });

      expect(renamed?.hasDungeon).toBe(true);

      await strapi.documents('api::location.location').update({
        documentId: seeded.documentId,
        data: { name: seeded.name },
      });
    });
  });

  // The export records disagreements with the rules, not the catalogue. It used
  // to compare against `NG`, which meant "nobody has set this" only while `NG`
  // was everyone's default; once grades became derived, that test would have
  // written some 884 entries restating the rules — and frozen them.
  describe('exporting the grades', () => {
    /** Never the real `catalog-grades.json`: the suite must not rewrite it. */
    const intoTempFile = async () => {
      const file = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-grades-')),
        'catalog-grades.json',
      );
      const report = await exportCatalogGrades(strapi, { file, source: slice });

      return { report, written: JSON.parse(fs.readFileSync(file, 'utf8')) };
    };

    it('writes nothing when every grade is the one the rules derived', async () => {
      const { report, written } = await intoTempFile();

      expect(report.bosses).toBe(0);
      expect(report.items).toBe(0);
      expect(written).toEqual({ bosses: {}, items: {} });
    });

    it('writes only the record somebody set against the rule', async () => {
      const [boss] = slice.bosses;
      const stored = await strapi.db
        .query('api::raid-boss.raid-boss')
        .findOne({ where: { slug: boss?.slug } });
      const other = await strapi.db
        .query('api::grade.grade')
        .findOne({ where: { code: boss?.grade === 's' ? 'a' : 's' } });

      await strapi.documents('api::raid-boss.raid-boss').update({
        documentId: stored.documentId,
        data: { grade: other.documentId },
      });

      const { report, written } = await intoTempFile();

      expect(report.bosses).toBe(1);
      expect(written.bosses).toEqual({ [boss?.slug as string]: other.code });
      // The other boss agreed with the rule and is therefore absent.
      expect(Object.keys(written.bosses)).toHaveLength(1);

      const back = await strapi.db
        .query('api::grade.grade')
        .findOne({ where: { code: boss?.grade } });
      await strapi.documents('api::raid-boss.raid-boss').update({
        documentId: stored.documentId,
        data: { grade: back.documentId },
      });
    });
  });

  it('leaves everything where it was when run again', async () => {
    const before = await counts();
    const slugsBefore = await strapi.db
      .query('api::raid-boss.raid-boss')
      .findMany({ select: ['slug'], orderBy: { slug: 'asc' } });

    await seedCatalog(strapi, slice);

    const after = await counts();
    const slugsAfter = await strapi.db
      .query('api::raid-boss.raid-boss')
      .findMany({ select: ['slug'], orderBy: { slug: 'asc' } });

    // Files above all: Strapi does not deduplicate uploads, so a seed that did
    // not look one up by name first would add another copy of every image.
    expect(after).toEqual(before);
    expect(slugsAfter).toEqual(slugsBefore);
  });
});
