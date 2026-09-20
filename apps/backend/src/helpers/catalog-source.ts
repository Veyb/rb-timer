/**
 * Reads the raid-boss reference under `apps/backend/mocks/raid-bosses/` and
 * turns it into the shapes the catalogue stores. Pure: no Strapi, no database,
 * no filesystem beyond reading those files and naming the images beside them —
 * so the corrections below can be tested without booting anything.
 *
 * Four files, together about a megabyte of TypeScript literal that nothing
 * imports at runtime: the bosses, their drops, the skills they carry and the
 * maps. They are separate because they are refreshed separately — see
 * `readRaw`, which joins them and refuses a join that has drifted. Each is read
 * as text, its `import type` line and type annotations stripped, and evaluated,
 * rather than `import`ed normally. Fragile in principle, and the shape is
 * stable: the refresh passes edit these files in place rather than rewriting
 * them, so a field no source states survives every run.
 *
 * Two things about the source shape, each verified against the data rather
 * than assumed:
 *
 *   * `itemId` is not an item identity. It is the source's icon field, and
 *     `itemId === basename(icon)` holds for all 3761 drop rows. 850 distinct
 *     item names share 441 icons, so keying items on it would collapse the
 *     catalogue to less than half. Items are keyed by name; `itemId` survives
 *     only as the key that finds the uploaded icon.
 *
 *   * `_iNN` on an icon name looks like noise and is not: stripping it would
 *     merge the four enchant-armour scrolls into one, the four enchant-weapon
 *     scrolls into one, and the Physical and Magical Rings of Queen Ant into
 *     each other. It is left alone, which is why nothing here touches it.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SOURCE_RELATIVE = path.join('apps', 'backend', 'mocks', 'raid-bosses', 'data-wiki.ts');

/**
 * The monorepo root, found by walking up for a landmark rather than by counting
 * `..` segments.
 *
 * This module runs from two different depths — `src/helpers` under vitest,
 * which transpiles in place, and `dist/src/helpers` under the seed script,
 * which runs the compiled output — so a fixed relative path is correct in one
 * and wrong in the other, and the failure is an ENOENT that names nothing.
 *
 * Anchoring on the root also keeps the hand-edited grades file pointing at the
 * source tree from both, which matters: the export writes it, and a copy inside
 * `dist/` would be overwritten by the next compile and never reach git.
 */
const findRepoRoot = () => {
  let dir = __dirname;

  for (;;) {
    if (fs.existsSync(path.join(dir, SOURCE_RELATIVE))) return dir;

    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find ${SOURCE_RELATIVE} above ${__dirname}`);
    }
    dir = parent;
  }
};

const REPO_ROOT = findRepoRoot();
const SOURCE_FILE = path.join(REPO_ROOT, SOURCE_RELATIVE);
const DROPS_FILE = path.join(path.dirname(SOURCE_FILE), 'drops.ts');
const MAPS_FILE = path.join(path.dirname(SOURCE_FILE), 'world-map.ts');
const SKILLS_FILE = path.join(path.dirname(SOURCE_FILE), 'skills.ts');

/** Where the images sit, relative to the source file. */
const IMAGES_DIR = path.join(path.dirname(SOURCE_FILE), 'images');

/** A skill's icon is stored as a key; this is what it resolves against. */
const SKILL_ICONS_DIR = path.join(IMAGES_DIR, 'skill-icons');

/** Weakest first, so `order` sorts the way the game does. */
export const GRADES = [
  { code: 'ng', label: 'NG', order: 0 },
  { code: 'd', label: 'D', order: 1 },
  { code: 'c', label: 'C', order: 2 },
  { code: 'b', label: 'B', order: 3 },
  { code: 'a', label: 'A', order: 4 },
  { code: 's', label: 'S', order: 5 },
];

export const DEFAULT_GRADE_CODE = 'ng';

const GRADE_ORDER = new Map(GRADES.map((grade) => [grade.code, grade.order]));

/**
 * The stronger of two grades, or the default when neither is known.
 *
 * This is how a boss gets its grade: the best thing in its drop list. Where the
 * catalogue used to read a boss's level through bands somebody chose, it now
 * reads what the boss actually gives you, which is both what the grade is for
 * and something the source states rather than something we infer.
 *
 * Measured before the rules were swapped: across all 158 bosses the two agree
 * on 154, no boss's top grade rests on a single row, and no boss has an empty
 * drop list. The four they disagree about are the subclass spirits, whose six
 * drops are all `NG` because what they give you is a subclass and not
 * equipment; they take `NG`, and an operator who reads that as wrong sets it in
 * `catalog-grades.json`, which still wins.
 */
const strongerGrade = (left: string | undefined, right: string | undefined): string => {
  const rank = (code: string | undefined) => GRADE_ORDER.get(code ?? '') ?? -1;

  if (rank(left) < 0 && rank(right) < 0) return DEFAULT_GRADE_CODE;

  return rank(left) >= rank(right) ? (left as string) : (right as string);
};

/**
 * Grades are this catalogue's own idea — the source has no such field — and are
 * set by hand after seeding. They cannot live in the source file: that file is
 * replaced wholesale when a better one turns up, which would take the hand-set
 * grades with it. So they get their own: a map of slug to grade code, written
 * by the export script and read here.
 *
 * Missing file, missing entry or unknown slug all fall back to `NG`. Being
 * incomplete is the normal state — a grade is only listed once someone has set
 * it.
 */
export interface CatalogGrades {
  bosses: Record<string, string>;
  items: Record<string, string>;
}

export const GRADES_FILE = path.join(
  REPO_ROOT,
  'apps',
  'backend',
  'src',
  'helpers',
  'catalog-grades.json',
);

/** Takes a path for the same reason `exportCatalogGrades` does: so a test can
 * write one somewhere other than the repository's own. */
export const readCatalogGrades = (file: string = GRADES_FILE): CatalogGrades => {
  if (!fs.existsSync(file)) return { bosses: {}, items: {} };

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<CatalogGrades>;

  return { bosses: parsed.bosses ?? {}, items: parsed.items ?? {} };
};

interface RawDrop {
  itemId: string;
  name: string;
  /** `ng`, `d`, `c`, `b` or `a`, as the source states beside the item's name. */
  grade: string;
  chance: number;
  minCount: number;
  maxCount: number;
  icon: string | null;
}

interface RawBoss {
  id: string;
  slug: string;
  name: string;
  race: string;
  level: number;
  epic: boolean;
  subclass: boolean;
  locations: { name: string; slug: string }[];
  avatar: { full: string; mini: string };
  mapX: number;
  mapY: number;
  /**
   * Where the boss's pin sits on the source's own 3004-pixel map, not a world
   * coordinate. It was called `worldX`/`worldY` until it was checked: the pair
   * stored for Queen Ant, `1557.91 / 2527.95`, is that pin's `left` and `top`
   * exactly. Real world coordinates, if a source for them appears, arrive as
   * fields of their own.
   */
  wikiX: number;
  wikiY: number;
  respawn: { fixed: boolean; baseHours: number | null; varianceHours: number | null };
  stats: Record<string, number>;
  /** Keys into `skills.ts`, of the form `<group>-<level>`. */
  skills: string[];
  saMaxLevel?: number;
  drops: RawDrop[];
}

interface RawPlan {
  name: string;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
  image: string;
}

interface RawModifier {
  kind: string;
  subject: string;
  value: number;
  unit: string;
}

interface RawSkill {
  key: string;
  group: string;
  level: number;
  name: string;
  origin: string;
  icon: string | null;
  modifiers: RawModifier[];
}

export interface CatalogLocation {
  slug: string;
  name: string;
  dungeon: { imagePath: string; mapX: number; mapY: number; width: number; height: number } | null;
}

export interface CatalogAvatar {
  slug: string;
  fullPath: string;
  miniPath: string;
}

export interface CatalogItem {
  slug: string;
  name: string;
  /** The source's `itemId`: names the icon, never the item. */
  iconKey: string | null;
  /**
   * The grade the source states for the item, not one this catalogue worked
   * out. It used to be inferred — from a `(D-Grade)` in the name where there
   * was one, otherwise from the levels of the bosses that drop it when they
   * agreed — and that disagreed with the source on 500 of the 850 items. It
   * also had no answer at all for 63 of them, which is how the defect was
   * found: an operator saw a long list of `C` equipment sitting at `NG`.
   */
  grade: string;
}

export interface CatalogBoss {
  slug: string;
  gameId: string;
  name: string;
  race: string;
  level: number;
  epic: boolean;
  /**
   * Whether killing the boss grants a subclass. Carried from the source rather
   * than derived: nothing in a boss's level, race or grade implies it.
   */
  subclass: boolean;
  /** The best grade in this boss's drop list; see `strongerGrade`. */
  grade: string;
  saMaxLevel: number | null;
  mapX: number;
  mapY: number;
  wikiX: number;
  wikiY: number;
  respawn: {
    kind: 'interval' | 'scheduled';
    baseMinutes: number | null;
    varianceMinutes: number | null;
  };
  stats: Record<string, number>;
  /** Keys of the skills this boss carries; see `CatalogSource.skills`. */
  skills: string[];
  locationSlug: string;
  avatarSlug: string;
}

export interface CatalogDrop {
  bossSlug: string;
  itemName: string;
  chance: number;
  minCount: number;
  maxCount: number;
}

/**
 * A skill the bosses carry, with its modifiers already sorted by what they
 * shift.
 *
 * The source's own shape is one list of modifiers each naming its `kind`; the
 * catalogue stores four lists, so that the kind is the field name and a weapon
 * cannot be recorded as an element. Splitting here rather than in the seeder
 * keeps the seeder a straight copy and puts the one place that can fail — a
 * kind nothing knows — beside the rest of the reader's tripwires.
 */
export interface CatalogSkill {
  key: string;
  gameId: string;
  level: number;
  name: string;
  origin: string;
  /** Absolute path to the icon file, or null for a skill the source has none for. */
  iconPath: string | null;
  weaponModifiers: { weapon: string; value: number; unit: string }[];
  elementModifiers: { element: string; value: number; unit: string }[];
  statModifiers: { stat: string; value: number; unit: string }[];
  conditionModifiers: { condition: string; value: number; unit: string }[];
}

export interface CatalogSource {
  locations: CatalogLocation[];
  avatars: CatalogAvatar[];
  items: CatalogItem[];
  bosses: CatalogBoss[];
  drops: CatalogDrop[];
  skills: CatalogSkill[];
  /** icon key -> absolute path, for the upload step. */
  icons: Map<string, string>;
  mapPath: string;
  /**
   * The source's own map, which `wikiX`/`wikiY` are pixels of. Separate from
   * `mapPath`, which is a different picture at a different size and is
   * what `mapX`/`mapY` are measured against.
   */
  wikiMapPath: string;
  /**
   * The date of the copy of the source the catalogue was built from — the
   * oldest of the data files', because the catalogue is only as current as its
   * stalest part. Null until a refresh has written one.
   */
  sourceReadOn: string | null;
}

/**
 * Turns an item name into a URL-safe slug. Checked: 850 names, 850 slugs.
 *
 * Only whitespace separates. Every other character that cannot appear in a slug
 * is removed rather than replaced, which is what makes `Knight's Sword` read
 * `knights-sword` and `Recipe: Dasparion's Staff(60%)` read
 * `recipe-dasparions-staff60`.
 *
 * That is the source's own rule, arrived at by reading its slugs rather than by
 * preference: applied to the 850 item names and 158 boss names it publishes, it
 * reproduces every one of its slugs exactly. Matching matters because a slug is
 * this catalogue's identity for a record, and two conventions for one name
 * means two records — the earlier rule, which turned an apostrophe into a
 * separator, disagreed on 135 items and 20 bosses.
 */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    // Decompose, then drop the combining marks NFKD split off, so an accented
    // letter becomes its plain counterpart instead of vanishing at the
    // alphanumeric filter below.
    .normalize('NFKD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The copy of the source a generated file was built from, as its own header
 * records it. Read as text rather than evaluated, so a file written before the
 * refreshes started stamping one simply has none.
 */
const readStamp = (file: string): string | null =>
  fs.readFileSync(file, 'utf8').match(/export const SOURCE_READ_ON = '([^']*)';/)?.[1] ?? null;

/** Evaluates one of the data files and hands back the names it exports. */
const evaluate = <T>(file: string, exported: string): T => {
  const script = fs
    .readFileSync(file, 'utf8')
    .replace(/^import[^;]+;$/gm, '')
    .replace(/export const (\w+)\s*(?::[^=]+)?=/g, 'const $1 =')
    .concat(`\n;({ ${exported} })`);

  return vm.runInNewContext(script, Object.create(null), {
    filename: file,
    timeout: 30_000,
  }) as T;
};

/**
 * The three data files, joined.
 *
 * They are separate because they are refreshed separately: drops come from one
 * article request, everything else from one request per boss, and the map from
 * neither. The join is on the game's own id, and it is checked rather than
 * assumed — a boss whose drops went missing because one file was refreshed and
 * the other was not would otherwise read as a boss that drops nothing, which is
 * indistinguishable from the truth.
 */
const readRaw = (): {
  bosses: RawBoss[];
  plans: Record<string, RawPlan>;
  map: string;
  wikiMap: string;
  skills: RawSkill[];
} => {
  const { RAID_BOSSES } = evaluate<{ RAID_BOSSES: Omit<RawBoss, 'drops'>[] }>(
    SOURCE_FILE,
    'RAID_BOSSES',
  );
  const { RAID_BOSS_DROPS } = evaluate<{ RAID_BOSS_DROPS: Record<string, RawDrop[]> }>(
    DROPS_FILE,
    'RAID_BOSS_DROPS',
  );
  const { DUNGEON_PLANS, MAP_IMAGE, WIKI_MAP_IMAGE } = evaluate<{
    DUNGEON_PLANS: Record<string, RawPlan>;
    MAP_IMAGE: string;
    WIKI_MAP_IMAGE: string;
  }>(MAPS_FILE, 'DUNGEON_PLANS, MAP_IMAGE, WIKI_MAP_IMAGE');
  const { SKILLS } = evaluate<{ SKILLS: RawSkill[] }>(SKILLS_FILE, 'SKILLS');

  const withoutDrops = RAID_BOSSES.filter((boss) => !RAID_BOSS_DROPS[boss.id]);
  if (withoutDrops.length) {
    throw new Error(
      `${withoutDrops.length} bosses have no entry in drops.ts (${withoutDrops
        .slice(0, 3)
        .map((boss) => boss.slug)
        .join(', ')}). The two files have drifted; re-run the drop refresh.`,
    );
  }

  const known = new Set(RAID_BOSSES.map((boss) => boss.id));
  const orphaned = Object.keys(RAID_BOSS_DROPS).filter((id) => !known.has(id));
  if (orphaned.length) {
    throw new Error(
      `drops.ts names ${orphaned.length} bosses the catalogue does not hold (${orphaned
        .slice(0, 3)
        .join(', ')}). The two files have drifted; re-run the profile refresh.`,
    );
  }

  // The same join, on the third file. A boss naming a skill nothing defines
  // would otherwise seed as a boss carrying one fewer skill than it has, which
  // reads exactly like a boss that carries fewer.
  const defined = new Set(SKILLS.map((skill) => skill.key));
  const dangling = [
    ...new Set(RAID_BOSSES.flatMap((boss) => boss.skills).filter((key) => !defined.has(key))),
  ];
  if (dangling.length) {
    throw new Error(
      `${dangling.length} skill keys are carried by a boss but not defined in skills.ts ` +
        `(${dangling.slice(0, 3).join(', ')}). Re-run the skill refresh.`,
    );
  }

  return {
    bosses: RAID_BOSSES.map((boss) => ({ ...boss, drops: RAID_BOSS_DROPS[boss.id] })),
    plans: DUNGEON_PLANS,
    map: MAP_IMAGE,
    wikiMap: WIKI_MAP_IMAGE,
    skills: SKILLS,
  };
};

/**
 * The location a boss belongs to. Every boss has exactly one — checked across
 * all 158, min 1 and max 1 — which is why the relation is many-to-one and not
 * the many-to-many the array shape would suggest.
 */
const locationOf = (boss: RawBoss) => {
  const raw = boss.locations[0];
  if (!raw) throw new Error(`Boss ${boss.slug} has no location`);

  return { slug: raw.slug, name: raw.name };
};

const toMinutes = (hours: number | null) => (hours === null ? null : Math.round(hours * 60));

/**
 * One skill, with its modifiers sorted into a list per kind.
 *
 * A kind nothing recognises stops the read rather than being dropped. The
 * parser that writes `skills.ts` already refuses a subject none of its
 * vocabularies knows, so reaching here means the two have drifted apart — and a
 * modifier silently missing from the catalogue is the one failure this shape
 * exists to prevent.
 */
const toCatalogSkill = (skill: RawSkill): CatalogSkill => {
  const catalogSkill: CatalogSkill = {
    key: skill.key,
    gameId: skill.group,
    level: skill.level,
    name: skill.name,
    origin: skill.origin,
    iconPath: skill.icon ? path.join(SKILL_ICONS_DIR, `${skill.icon}.webp`) : null,
    weaponModifiers: [],
    elementModifiers: [],
    statModifiers: [],
    conditionModifiers: [],
  };

  for (const { kind, subject, value, unit } of skill.modifiers) {
    switch (kind) {
      case 'weapon':
        catalogSkill.weaponModifiers.push({ weapon: subject, value, unit });
        break;
      case 'element':
        catalogSkill.elementModifiers.push({ element: subject, value, unit });
        break;
      case 'stat':
        catalogSkill.statModifiers.push({ stat: subject, value, unit });
        break;
      case 'condition':
        catalogSkill.conditionModifiers.push({ condition: subject, value, unit });
        break;
      default:
        throw new Error(
          `skills.ts: ${skill.key} states a modifier of kind "${kind}" (${subject}), which the ` +
            'catalogue has no list for. Add one, or fix the skill refresh.',
        );
    }
  }

  return catalogSkill;
};

export const readCatalogSource = (): CatalogSource => {
  const { bosses: raw, plans, map, wikiMap, skills: rawSkills } = readRaw();

  const locations = new Map<string, CatalogLocation>();
  const avatars = new Map<string, CatalogAvatar>();
  const items = new Map<string, CatalogItem>();
  const icons = new Map<string, string>();
  const bosses: CatalogBoss[] = [];
  const drops: CatalogDrop[] = [];

  for (const boss of raw) {
    const location = locationOf(boss);
    if (!locations.has(location.slug)) {
      locations.set(location.slug, { slug: location.slug, name: location.name, dungeon: null });
    }

    const avatarSlug = path.basename(boss.avatar.full, '.webp');
    if (!avatars.has(avatarSlug)) {
      avatars.set(avatarSlug, {
        slug: avatarSlug,
        fullPath: path.join(path.dirname(SOURCE_FILE), boss.avatar.full),
        miniPath: path.join(path.dirname(SOURCE_FILE), boss.avatar.mini),
      });
    }

    bosses.push({
      slug: boss.slug,
      gameId: boss.id,
      name: boss.name,
      race: boss.race.toLowerCase(),
      level: boss.level,
      epic: boss.epic,
      subclass: boss.subclass,
      // Raised below to the best grade in this boss's drop list.
      grade: DEFAULT_GRADE_CODE,
      saMaxLevel: boss.saMaxLevel ?? null,
      mapX: boss.mapX,
      mapY: boss.mapY,
      wikiX: boss.wikiX,
      wikiY: boss.wikiY,
      respawn: boss.respawn.fixed
        ? // The source records these three epics as the literal string "Fixed"
          // and names no day. The shape is here; the entries are authored later.
          { kind: 'scheduled', baseMinutes: null, varianceMinutes: null }
        : {
            kind: 'interval',
            baseMinutes: toMinutes(boss.respawn.baseHours),
            varianceMinutes: toMinutes(boss.respawn.varianceHours),
          },
      stats: boss.stats,
      skills: boss.skills,
      locationSlug: location.slug,
      avatarSlug,
    });

    const current = bosses[bosses.length - 1] as CatalogBoss;

    for (const drop of boss.drops) {
      if (!items.has(drop.name)) {
        items.set(drop.name, {
          slug: slugify(drop.name),
          name: drop.name,
          iconKey: drop.itemId || null,
          grade: drop.grade,
        });
      }

      current.grade = strongerGrade(current.grade, drop.grade);

      if (drop.itemId && drop.icon && !icons.has(drop.itemId)) {
        icons.set(drop.itemId, path.join(path.dirname(SOURCE_FILE), drop.icon));
      }

      drops.push({
        bossSlug: boss.slug,
        itemName: drop.name,
        chance: drop.chance,
        minCount: drop.minCount,
        maxCount: drop.maxCount,
      });
    }
  }

  // Dungeon plans are keyed by location slug, and every key is a slug some boss
  // uses — checked, none is orphaned.
  for (const [slug, plan] of Object.entries(plans)) {
    const location = locations.get(slug);
    if (!location) continue;

    location.dungeon = {
      imagePath: path.join(path.dirname(SOURCE_FILE), plan.image),
      mapX: plan.mapX,
      mapY: plan.mapY,
      width: plan.width,
      height: plan.height,
    };
  }

  return {
    locations: [...locations.values()],
    avatars: [...avatars.values()],
    items: [...items.values()],
    bosses,
    drops,
    skills: rawSkills.map(toCatalogSkill),
    icons,
    mapPath: path.join(path.dirname(SOURCE_FILE), map),
    wikiMapPath: path.join(path.dirname(SOURCE_FILE), wikiMap),
    sourceReadOn:
      [SOURCE_FILE, DROPS_FILE, SKILLS_FILE]
        .map(readStamp)
        .filter((stamp): stamp is string => stamp !== null)
        .sort()[0] ?? null,
  };
};

export const IMAGES_ROOT = IMAGES_DIR;
