// Covers the seeding half of specs/raid-boss-catalog: that a fresh database
// ends up holding the catalogue, that running the seed again leaves it where it
// was, and that the two things the source shape makes easy to get wrong — a
// shared avatar and a fractional drop chance — survive the round trip.
//
// Seeds a slice rather than all 158 bosses. `seedCatalog` takes the source as
// an argument for exactly this: the full run writes several thousand drops and uploads
// hundreds of images, which is a minute of wall clock to prove something a
// handful of records proves just as well. The full run is exercised by
// `pnpm seed:catalog` against a real database.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportCatalogGrades } from '../src/helpers/catalog-export';
import { pruneCatalog } from '../src/helpers/catalog-prune';
import { seedCatalog } from '../src/helpers/catalog-seed';
import { type CatalogSource, readCatalogSource } from '../src/helpers/catalog-source';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

let strapi: Core.Strapi;
let slice: CatalogSource;

/**
 * Two bosses that share an avatar and a skill, with everything they reference.
 * Found rather than hardcoded: avatars and skills are both shared by many
 * bosses, so such a pair always exists — nearly every shared-avatar group
 * qualifies — but which one is not something to freeze into a test.
 *
 * Both halves are required rather than hoped for. The sharing is what the
 * avatar and skill tests below are about, and a slice that happened to pick a
 * pair sharing neither would leave them passing while proving nothing.
 */
const takeSlice = (source: CatalogSource): CatalogSource => {
  const byAvatar = new Map<string, typeof source.bosses>();
  for (const boss of source.bosses) {
    byAvatar.set(boss.avatarSlug, [...(byAvatar.get(boss.avatarSlug) ?? []), boss]);
  }

  const shared = [...byAvatar.values()].find(
    (group) => group.length > 1 && group[0]?.skills.some((key) => group[1]?.skills.includes(key)),
  );
  if (!shared) throw new Error('expected two bosses sharing both an avatar and a skill');

  const bosses = shared.slice(0, 2);
  const bossSlugs = new Set(bosses.map((boss) => boss.slug));
  const drops = source.drops.filter((drop) => bossSlugs.has(drop.bossSlug));
  const itemNames = new Set(drops.map((drop) => drop.itemName));
  const items = source.items.filter((item) => itemNames.has(item.name));
  const locationSlugs = new Set(bosses.map((boss) => boss.locationSlug));
  // Only the skills these two carry. Seeding all 25 would leave 23 of them
  // attached to nothing, and the count assertions could then no longer tell a
  // skill that failed to relate from one no boss in the slice has.
  const skillKeys = new Set(bosses.flatMap((boss) => boss.skills));

  return {
    bosses,
    drops,
    items,
    locations: source.locations.filter((location) => locationSlugs.has(location.slug)),
    avatars: source.avatars.filter((avatar) => avatar.slug === bosses[0]?.avatarSlug),
    skills: source.skills.filter((skill) => skillKeys.has(skill.key)),
    icons: source.icons,
    mapPath: source.mapPath,
    wikiMapPath: source.wikiMapPath,
    sourceReadOn: source.sourceReadOn,
  };
};

const counts = async () => ({
  grades: await strapi.db.query('api::grade.grade').count(),
  locations: await strapi.db.query('api::location.location').count(),
  avatars: await strapi.db.query('api::avatar.avatar').count(),
  items: await strapi.db.query('api::item.item').count(),
  skills: await strapi.db.query('api::skill.skill').count(),
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
    expect(after.skills).toBe(slice.skills.length);
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

  it('writes whether a boss grants a subclass rather than leaving it at the default', async () => {
    const [boss] = slice.bosses;
    if (!boss) throw new Error('expected the slice to hold a boss');

    const stored = await strapi.db
      .query('api::raid-boss.raid-boss')
      .findOne({ where: { slug: boss.slug } });

    expect(stored.subclass).toBe(boss.subclass);

    // Agreeing proves little on its own: the schema defaults the field to
    // false, and so does every boss but four. Flipping the stored value and
    // seeding again is what shows the payload carries it.
    await strapi.documents('api::raid-boss.raid-boss').update({
      documentId: stored.documentId,
      data: { subclass: !boss.subclass },
    });

    await seedCatalog(strapi, slice);

    const reseeded = await strapi.db
      .query('api::raid-boss.raid-boss')
      .findOne({ where: { slug: boss.slug } });

    expect(reseeded.subclass).toBe(boss.subclass);
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

  it('puts both world maps on a record something can reach', async () => {
    const [record] = await strapi.db
      .query('api::map.map')
      .findMany({ populate: { map: true, wikiMap: true } });

    // Uploaded and unreferenced, the only way to either image was a URL
    // carrying the suffix Strapi generates at upload time — which changes on
    // the next seed, so it could not be written down anywhere.
    expect(record.map?.url).toBeTruthy();
    expect(record.wikiMap?.url).toBeTruthy();
    expect(record.map.id).not.toBe(record.wikiMap.id);

    // The pixel basis for `wikiX`/`wikiY` is the image's own width, read off
    // the file rather than recorded beside it, so the two cannot disagree.
    expect(record.wikiMap.width).toBe(record.wikiMap.height);
    expect(record.map.width).not.toBe(record.wikiMap.width);
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

  it('keeps affinities on the skill rather than copying them onto the boss', () => {
    const { attributes } = strapi.contentType('api::raid-boss.raid-boss');

    // What a boss resists is a property of the skills it carries. Held on the
    // boss as well it would be two answers to one question, and the refresh
    // that rebalanced a skill would leave the boss's copy quietly stale.
    expect(attributes).toHaveProperty('skills');
    for (const gone of ['resistances', 'vulnerabilities', 'elementModifiers', 'statModifiers']) {
      expect(attributes).not.toHaveProperty(gone);
    }
  });

  describe('skills', () => {
    /** The shared skill, as one boss reports it. */
    const asReportedBy = async (slug: string, key: string) => {
      const [boss] = await strapi.db.query('api::raid-boss.raid-boss').findMany({
        where: { slug },
        populate: { skills: { populate: { weaponModifiers: true } } },
      });

      return (boss.skills as { id: number; documentId: string; key: string }[]).find(
        (skill) => skill.key === key,
      );
    };

    it('relates a boss to every skill the source says it carries', async () => {
      for (const boss of slice.bosses) {
        const [stored] = await strapi.db
          .query('api::raid-boss.raid-boss')
          .findMany({ where: { slug: boss.slug }, populate: { skills: true } });

        expect((stored.skills as { key: string }[]).map((skill) => skill.key).sort()).toEqual(
          [...boss.skills].sort(),
        );
      }
    });

    it('carries each skill its icon, the way an item carries its own', async () => {
      const stored = await strapi.db
        .query('api::skill.skill')
        .findMany({ populate: { icon: true } });

      // Asserted against what the source states rather than against all of
      // them: every skill in the catalogue has an icon today, and a future one
      // that does not should not fail this.
      const named = new Set(slice.skills.filter((skill) => skill.iconPath).map((s) => s.key));
      expect(named.size).toBeGreaterThan(0);

      for (const skill of stored as { key: string; icon?: { name: string; url: string } }[]) {
        if (!named.has(skill.key)) continue;

        // Named from the folder as well as the file: `skill4010.webp` alone
        // would collide the day an item icon is called the same thing.
        expect(skill.icon?.name).toMatch(/^skill-icons-/);
        expect(skill.icon?.url).toBeTruthy();
      }
    });

    it('gives two bosses carrying one skill the same record, not a copy each', async () => {
      const [first, second] = slice.bosses;
      const shared = first?.skills.find((key) => second?.skills.includes(key));
      if (!shared || !first || !second) throw new Error('the slice is meant to share a skill');

      const onFirst = await asReportedBy(first.slug, shared);
      const onSecond = await asReportedBy(second.slug, shared);

      expect(onFirst?.id).toBeDefined();
      expect(onFirst?.id).toBe(onSecond?.id);

      // One record means one edit, which is the whole reason a skill is not
      // copied onto each boss. Rebalancing it has to reach both.
      await strapi.documents('api::skill.skill').update({
        documentId: onFirst?.documentId as string,
        data: { weaponModifiers: [{ weapon: 'spear', value: 99, unit: 'percent' }] } as never,
      });

      for (const slug of [first.slug, second.slug]) {
        const after = (await asReportedBy(slug, shared)) as unknown as {
          weaponModifiers: { weapon: string; value: number }[];
        };

        expect(after.weaponModifiers).toEqual([
          expect.objectContaining({ weapon: 'spear', value: 99 }),
        ]);
      }

      // Put the source's own modifiers back, so the tests after this one see
      // the catalogue and not the edit.
      await seedCatalog(strapi, slice);
    });

    // A skill's modifiers are four lists and not one, so that the kind of thing
    // being shifted is the field name rather than a value beside it. That is
    // the whole point of the shape, and it is worth one test: a single list
    // with a `kind` column would accept `kind: weapon` next to `subject: fire`
    // and nothing would notice until a reader tried to use it.
    const create = (subject: string) =>
      strapi.documents('api::skill.skill').create({
        data: {
          key: `9999-${subject}`,
          gameId: '9999',
          level: 1,
          name: 'Only a test',
          origin: 'personal',
          weaponModifiers: [{ weapon: subject, value: 10, unit: 'percent' }],
        } as never,
      });

    it('refuses a weapon whose subject belongs to another vocabulary', async () => {
      // Matched on the message rather than on any rejection: `fire` has to be
      // refused for being outside the weapon vocabulary, not because the
      // payload was malformed in some other way.
      await expect(create('fire')).rejects.toThrow(/weapon/i);
    });

    it('accepts one the weapon vocabulary knows', async () => {
      const created = await create('spear');

      const stored = await strapi.db
        .query('api::skill.skill')
        .findOne({ where: { key: '9999-spear' }, populate: { weaponModifiers: true } });

      expect(stored.weaponModifiers).toEqual([
        expect.objectContaining({ weapon: 'spear', value: 10, unit: 'percent' }),
      ]);

      await strapi.documents('api::skill.skill').delete({ documentId: created.documentId });
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

  /**
   * Last on purpose: this is the one thing here that removes rows, and the
   * tests above want a catalogue the seed left intact. The only one that
   * actually deletes seeds again afterwards.
   */
  describe('pruning what the source stopped listing', () => {
    /**
     * The seeded slice minus one drop: a source that has stopped stating a row.
     *
     * The drop is chosen rather than taken first, and it matters. The slice's
     * first drop is `Proof of Loyalty`, which both of its bosses drop, so
     * removing it would leave the item still dropped and never exercise the
     * second half of the prune at all. This picks one whose item nothing else
     * in the slice names, so the drop goes and the item goes with it.
     */
    const withoutOneDrop = () => {
      const namedOnce = (name: string) =>
        slice.drops.filter((drop) => drop.itemName === name).length === 1;
      const gone = slice.drops.find((drop) => namedOnce(drop.itemName));
      if (!gone) throw new Error('expected a drop whose item nothing else in the slice names');

      return {
        gone,
        source: { ...slice, drops: slice.drops.filter((drop) => drop !== gone) },
      };
    };

    it('lists what it would remove and removes nothing', async () => {
      const before = await counts();
      const { gone, source } = withoutOneDrop();

      const report = await pruneCatalog(strapi, { source });

      expect(report.deleted).toBe(false);
      expect(report.drops).toEqual([`${gone.bossSlug} — ${gone.itemName}`]);
      expect(report.items).toEqual([gone.itemName]);
      expect(await counts()).toEqual(before);
    });

    it('refuses a source that yields no bosses, rather than emptying the catalogue', async () => {
      const before = await counts();

      // The failure this guards against is a source that failed to load, which
      // from here is indistinguishable from a game with no raid bosses left.
      await expect(
        pruneCatalog(strapi, { source: { ...slice, bosses: [], drops: [] }, deleting: true }),
      ).rejects.toThrow(/no bosses/);

      expect(await counts()).toEqual(before);
    });

    it('names an item somebody graded by hand instead of removing it', async () => {
      const { gone, source } = withoutOneDrop();

      const item = await strapi.db
        .query('api::item.item')
        .findOne({ where: { name: gone.itemName } });

      const gradesFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-grades-')),
        'catalog-grades.json',
      );
      fs.writeFileSync(gradesFile, JSON.stringify({ bosses: {}, items: { [item.slug]: 'a' } }));

      const before = await counts();
      const report = await pruneCatalog(strapi, { source, deleting: true, gradesFile });

      expect(report.keptByHand).toEqual([gone.itemName]);
      expect(report.items).toEqual([]);

      const after = await counts();
      // The drop went; the item stayed, because the grade is work the catalogue
      // cannot derive again.
      expect(after.drops).toBe(before.drops - 1);
      expect(after.items).toBe(before.items);
      expect(after.files).toBe(before.files);

      await seedCatalog(strapi, slice);
    });

    it('removes the drop first, then the item nothing drops any more', async () => {
      const { source } = withoutOneDrop();
      const before = await counts();

      const report = await pruneCatalog(strapi, { source, deleting: true });

      expect(report.deleted).toBe(true);

      const after = await counts();
      expect(after.drops).toBe(before.drops - 1);
      expect(after.items).toBe(before.items - 1);
      // Imagery is never removed: a file nothing references looks exactly like
      // one an operator uploaded.
      expect(after.files).toBe(before.files);
      expect(after.bosses).toBe(before.bosses);

      // An item another drop still names is kept, whatever else went.
      const survivors = await strapi.db.query('api::item.item').findMany({ select: ['name'] });
      const stillDropped = new Set(source.drops.map((drop) => drop.itemName));
      for (const name of stillDropped) {
        expect(survivors.map((item: { name: string }) => item.name)).toContain(name);
      }

      // Seeding puts back exactly what the source states, which is how the
      // prune is meant to be recovered from.
      await seedCatalog(strapi, slice);
      expect(await counts()).toEqual(before);
    });
  });
});
