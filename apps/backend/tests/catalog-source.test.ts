// Covers the normalisation half of specs/raid-boss-catalog: the corrections
// made to the scraped source on the way in. Pure — no Strapi, no database —
// which is the point of keeping the reader free of both.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GRADE_CODE,
  GRADES,
  readCatalogSource,
  slugify,
} from '../src/helpers/catalog-source';

const source = readCatalogSource();

/**
 * One of the mock files, read as text in a sandbox the way `catalog-source.ts`
 * itself reads them.
 *
 * Everything below that counts records counts them from here rather than from
 * the reader. Read back off the reader the counts are true by construction and
 * the assertion could never fail; against the files they are a real check, and
 * they need no editing when the game patches, because both sides move together.
 */
const readMock = <T>(file: string, exported: string): T => {
  const script = fs
    .readFileSync(path.join(__dirname, '..', 'mocks', 'raid-bosses', file), 'utf8')
    .replace(/^import[^;]+;$/gm, '')
    .replace(/export const (\w+)\s*(?::[^=]+)?=/g, 'const $1 =')
    .concat(`\n;({ ${exported} })`);

  return (
    vm.runInNewContext(script, Object.create(null), { timeout: 30_000 }) as Record<string, T>
  )[exported] as T;
};

type MockDrop = { name: string; grade: string };

/**
 * Every grade the mock states for each item name.
 *
 * A set per name rather than a value, because "the source never states one item
 * at two grades" is half of what is being checked.
 */
const gradesByItemName = () => {
  const rows = readMock<Record<string, MockDrop[]>>('drops.ts', 'RAID_BOSS_DROPS');

  const grades = new Map<string, Set<string>>();
  for (const list of Object.values(rows)) {
    for (const drop of list) {
      if (!grades.has(drop.name)) grades.set(drop.name, new Set());
      grades.get(drop.name)?.add(drop.grade);
    }
  }

  return grades;
};

describe('the catalogue source reader', () => {
  // What a frozen census was really there to catch: the reader quietly losing
  // records. Said as a rule instead — one boss out, one drop row out, one skill
  // out — so it holds at any size and survives every patch without an edit.
  //
  // These four are one-to-one with the files. The three that are not — items,
  // avatars and locations, which the reader folds — are checked where the fold
  // itself is, further down.
  it('yields a record for everything the mock files hold', () => {
    const bosses = readMock<{ skills: string[] }[]>('data-wiki.ts', 'RAID_BOSSES');
    const rows = readMock<Record<string, unknown[]>>('drops.ts', 'RAID_BOSS_DROPS');
    const skills = readMock<Record<string, unknown>>('skills.ts', 'SKILLS');
    const usages = (list: { skills: string[] }[]) =>
      list.reduce((total, boss) => total + boss.skills.length, 0);

    expect(source.bosses).toHaveLength(bosses.length);
    expect(source.skills).toHaveLength(Object.keys(skills).length);
    expect(source.drops).toHaveLength(
      Object.values(rows).reduce((total, list) => total + list.length, 0),
    );
    // Far more usages than skills is the whole point of the relation; that the
    // two match is what says no boss lost one on the way in.
    expect(usages(source.bosses)).toBe(usages(bosses));
    expect(source.skills.length).toBeLessThan(usages(source.bosses));
  });

  it('keys items by name, not by the icon the source calls itemId', () => {
    // Far more names than icons: `etc_sword_body_i00` alone is Heavy Sword
    // Edge, Saber Blade, Shilen Knife Edge and dozens more. Keying on it would
    // collapse the catalogue to about half.
    const iconKeys = new Set(source.items.map((item) => item.iconKey).filter(Boolean));

    expect(iconKeys.size).toBeLessThan(source.items.length);
    // The icon map and the items have to agree about which keys exist, or the
    // seed uploads a picture nothing points at, or points at one it never
    // uploaded.
    expect(source.icons.size).toBe(iconKeys.size);
  });

  // The three the reader folds, where many rows collapse into one record.
  // Counted out of the files too, so what is checked is that the fold kept
  // every distinct value and invented none — which is the part a frozen total
  // could only hint at.
  it('folds repeated names, avatars and places into one record each', () => {
    const bosses = readMock<{ avatar: { full: string }; locations: { slug: string }[] }[]>(
      'data-wiki.ts',
      'RAID_BOSSES',
    );

    expect(source.items).toHaveLength(gradesByItemName().size);
    expect(source.avatars).toHaveLength(new Set(bosses.map((boss) => boss.avatar.full)).size);
    expect(source.locations).toHaveLength(
      new Set(bosses.flatMap((boss) => boss.locations.map((location) => location.slug))).size,
    );

    // Each is shared, which is why it is a record of its own rather than a
    // field repeated on every boss that uses it.
    expect(source.avatars.length).toBeLessThan(source.bosses.length);
    expect(source.locations.length).toBeLessThan(source.bosses.length);
  });

  it('gives every item a distinct slug', () => {
    const slugs = new Set(source.items.map((item) => item.slug));

    expect(slugs.size).toBe(source.items.length);
    expect(slugify('Scroll: Enchant Armor (D-Grade)')).toBe('scroll-enchant-armor-d-grade');
  });

  it('gives every boss a distinct slug and keeps the game id', () => {
    expect(new Set(source.bosses.map((boss) => boss.slug)).size).toBe(source.bosses.length);
    expect(new Set(source.bosses.map((boss) => boss.gameId)).size).toBe(source.bosses.length);
    expect(source.bosses.every((boss) => /^[a-z0-9-]+$/.test(boss.slug))).toBe(true);
  });

  it('gives every location a slug of its own', () => {
    const slugs = source.locations.map((location) => location.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(source.locations.every((location) => /^[a-z0-9-]+$/.test(location.slug))).toBe(true);
  });

  it('leaves every boss with exactly one location that exists', () => {
    const known = new Set(source.locations.map((location) => location.slug));

    for (const boss of source.bosses) {
      expect(known.has(boss.locationSlug)).toBe(true);
    }
  });

  it('carries the dungeon plans onto their locations', () => {
    const withPlan = source.locations.filter((location) => location.dungeon !== null);

    // A count rather than a snapshot, because this one does not drift with the
    // game: the plans are assembled by hand in `world-map.ts` and the source
    // publishes none of them, so no refresh touches them. A change here is
    // somebody's edit, which is exactly what should have to be confirmed.
    expect(withPlan).toHaveLength(15);
    expect(withPlan[0]?.dungeon?.width).toBeGreaterThan(0);
  });

  it('states respawn intervals in minutes and marks the epics as scheduled', () => {
    const scheduled = source.bosses.filter((boss) => boss.respawn.kind === 'scheduled');
    const sixHours = source.bosses.find((boss) => boss.respawn.baseMinutes === 360);

    // The epics and only the epics: the source records those, and nothing else,
    // as "Fixed". Stated as the two sets of slugs rather than as a count, which
    // is both what the test's name claims and what survives a patch that adds a
    // boss which is neither.
    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled.map((boss) => boss.slug).sort()).toEqual(
      source.bosses
        .filter((boss) => boss.epic)
        .map((boss) => boss.slug)
        .sort(),
    );
    expect(scheduled.every((boss) => boss.respawn.baseMinutes === null)).toBe(true);

    expect(sixHours?.respawn.varianceMinutes).toBe(120);
    expect(
      source.bosses
        .filter((boss) => boss.respawn.kind === 'interval')
        .every((boss) => Number.isInteger(boss.respawn.baseMinutes)),
    ).toBe(true);
  });

  it('lowercases the race, which the boss enumeration only accepts lowercase', () => {
    // The source writes `Bug`; the content type's enumeration lists `bug`. The
    // seed would be refused one boss at a time if this drifted. It was two
    // vocabularies until the weapon records went; races are what is left.
    const races = new Set(source.bosses.map((boss) => boss.race));

    expect([...races].every((race) => race === race.toLowerCase())).toBe(true);
  });

  it('preserves a fractional drop chance exactly', () => {
    // Puma Skin Gaiters. The reference states this as a weight of 38.7833
    // inside a group gated at 97.4288%, and the two multiply to the rate a
    // player sees. Folding them is what brings this back to the 37.7861 the
    // original scrape published, which is the check that the fold is right.
    const precise = source.drops.find((drop) => drop.chance === 37.7861);

    expect(precise).toBeDefined();
    expect(source.drops.every((drop) => drop.chance > 0 && drop.chance <= 100)).toBe(true);
  });

  /**
   * Every modifier subject, against the vocabulary the database will accept.
   *
   * Read out of the component schemas rather than restated here, because a
   * second copy of a list is a second thing to keep right. What this catches is
   * the source naming something new — a seventh weapon, a statistic the
   * catalogue has no word for — which would otherwise get as far as the seed
   * and be refused there, one boss at a time, with no clue as to why.
   */
  it('draws every modifier subject from a vocabulary the catalogue knows', () => {
    const vocabularyOf = (component: string, field: string): Set<string> => {
      const schema = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '..', 'src', 'components', 'skill', `${component}.json`),
          'utf8',
        ),
      );

      return new Set(schema.attributes[field].enum);
    };

    const lists = [
      ['weaponModifiers', 'weapon', vocabularyOf('weapon-modifier', 'weapon')],
      ['elementModifiers', 'element', vocabularyOf('element-modifier', 'element')],
      ['statModifiers', 'stat', vocabularyOf('stat-modifier', 'stat')],
      ['conditionModifiers', 'condition', vocabularyOf('condition-modifier', 'condition')],
    ] as const;
    const units = vocabularyOf('weapon-modifier', 'unit');

    // Collected rather than asserted one at a time, so a failure names every
    // word the catalogue would have to learn instead of only the first.
    const unknown: string[] = [];
    let checked = 0;

    for (const skill of source.skills) {
      for (const [list, field, vocabulary] of lists) {
        for (const modifier of skill[list] as unknown as Record<string, string>[]) {
          if (!vocabulary.has(modifier[field] as string)) {
            unknown.push(`${skill.key} ${field}=${modifier[field]}`);
          }
          if (!units.has(modifier.unit)) unknown.push(`${skill.key} unit=${modifier.unit}`);
          checked++;
        }
      }
    }

    expect(unknown).toEqual([]);
    // Guards against the vacuous pass, nothing more: an empty vocabulary or a
    // renamed field would leave `unknown` empty because the loops never ran.
    // What that takes is one modifier, not a particular number of them.
    expect(checked).toBeGreaterThan(0);
  });

  // Not by name: the display name is the least stable field in the source, and
  // was the one the two sources disagreed about most.
  it('marks exactly the four bosses that grant a subclass', () => {
    const granting = source.bosses
      .filter((boss) => boss.subclass)
      .map((boss) => boss.gameId)
      .sort();

    expect(granting).toEqual(['34141', '34142', '34143', '34144']);
    expect(source.bosses.every((boss) => typeof boss.subclass === 'boolean')).toBe(true);
  });

  it('names every drop against a boss and an item that exist', () => {
    const bossSlugs = new Set(source.bosses.map((boss) => boss.slug));
    const itemNames = new Set(source.items.map((item) => item.name));

    for (const drop of source.drops) {
      expect(bossSlugs.has(drop.bossSlug)).toBe(true);
      expect(itemNames.has(drop.itemName)).toBe(true);
    }
  });

  it('pairs a boss with an item at most once', () => {
    // The separator used to be a literal NUL, which made git treat this whole
    // file as binary — no diff, no blame. A boss slug is `[a-z0-9-]` and cannot
    // contain a pipe, so the join is just as unambiguous and stays readable.
    const pairs = new Set(source.drops.map((drop) => `${drop.bossSlug}|${drop.itemName}`));

    expect(pairs.size).toBe(source.drops.length);
  });

  it("takes an item's grade from the source rather than working one out", () => {
    // The reference states a grade beside every item it lists, on every drop
    // row, and never states one item at two grades — both of which this test
    // checks rather than asserts by count. The catalogue used to infer it
    // instead and disagreed with the source on 500 items of the 850 it then
    // held — in both directions. It called fragments and recipes
    // equipment because a high-level boss dropped them, and it called real C
    // equipment `NG` because an epic and an ordinary boss disagreed about it.
    const stated = gradesByItemName();

    expect(stated.size).toBe(source.items.length);
    for (const item of source.items) {
      expect([...(stated.get(item.name) ?? [])]).toEqual([item.grade]);
    }

    // Named rather than counted, because these are the ones that were wrong and
    // the rule that got them wrong is the thing this replaces. `Berserker
    // Blade` fell off one level-48 boss and three epics; the scroll names a
    // grade it does not have, being the thing you enchant *with*.
    const gradeOf = (name: string) => source.items.find((item) => item.name === name)?.grade;

    expect(gradeOf('Berserker Blade')).toBe('c');
    expect(gradeOf('Akat Long Bow')).toBe('c');
    expect(gradeOf('Composite Armor')).toBe('c');
    expect(gradeOf('Unidentified Blood Tornado')).toBe('a');
    expect(gradeOf('Proof of Loyalty')).toBe('ng');
    expect(gradeOf('Scroll: Enchant Armor (D-Grade)')).toBe('ng');
  });

  it('grades a boss by the best thing it drops', () => {
    const order = new Map(GRADES.map((grade) => [grade.code, grade.order]));
    const rank = (code: string) => order.get(code) ?? -1;

    for (const boss of source.bosses) {
      const dropped = source.drops
        .filter((drop) => drop.bossSlug === boss.slug)
        .map((drop) => source.items.find((item) => item.name === drop.itemName)?.grade ?? 'ng');

      expect(dropped.length).toBeGreaterThan(0);
      expect(rank(boss.grade)).toBe(Math.max(...dropped.map(rank)));
    }

    // The four the old level bands and this rule disagree about, and the only
    // ones. Their six drops are spellbooks and ancient books, all `NG`, because
    // what a subclass boss gives you is a subclass and not equipment. Left at
    // `NG` deliberately: an operator who reads that as wrong sets it by hand,
    // and `catalog-grades.json` still outranks anything derived here.
    const spirits = source.bosses.filter((boss) => boss.subclass);

    // Which four they are is pinned by game id in its own test above; here the
    // count only keeps the `every` below from passing on an empty list.
    expect(spirits.length).toBeGreaterThan(0);
    expect(spirits.every((boss) => boss.grade === DEFAULT_GRADE_CODE)).toBe(true);

    // Epic says nothing about grade on this server, which is the whole reason
    // the rule reads the drop list instead of the boss. Stated as "ordinary
    // bosses outrank every epic" rather than by naming the epics' grades: those
    // come out of the drop tables the game rebalances most often, and the claim
    // is about the two being unrelated, not about which letter it landed on.
    const epics = source.bosses.filter((boss) => boss.epic);
    const best = Math.max(...epics.map((boss) => rank(boss.grade)));

    expect(epics.length).toBeGreaterThan(0);
    expect(source.bosses.some((boss) => !boss.epic && rank(boss.grade) > best)).toBe(true);
    expect(source.bosses.some((boss) => boss.grade === 's')).toBe(false);
  });

  it('orders the grades the way the game does, not alphabetically', () => {
    expect(GRADES.map((grade) => grade.label)).toEqual(['NG', 'D', 'C', 'B', 'A', 'S']);
    expect(GRADES.map((grade) => grade.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
