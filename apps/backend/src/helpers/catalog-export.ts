/**
 * Writes the grades that disagree with the rules to
 * `src/helpers/catalog-grades.json`, which the seed reads back.
 *
 * The seed derives a grade for almost everything — a boss's from its level, an
 * item's from its own name or from the bosses that drop it — so a grade equal
 * to the derived one says nothing: the rules will produce it again on a fresh
 * database. What has to be recorded is where somebody looked at the derived
 * value and decided otherwise, because that judgement exists nowhere else.
 *
 * This used to compare against `NG`, which was right while `NG` was the default
 * for everything and therefore meant "nobody has set this". Once grades became
 * derived that test broke in a quiet way: nearly every record differs from `NG`
 * now, so the file would have swelled to some 884 entries that merely restated
 * the rules — and, worse, would then have overridden those rules for every
 * record, so changing a band later would have silently done nothing.
 */

import fs from 'node:fs';
import type { Core } from '@strapi/strapi';

import {
  type CatalogGrades,
  type CatalogSource,
  DEFAULT_GRADE_CODE,
  GRADES_FILE,
  readCatalogSource,
} from './catalog-source';

export interface ExportReport {
  bosses: number;
  items: number;
  file: string;
}

const gradesOf = async (
  strapi: Core.Strapi,
  uid: 'api::raid-boss.raid-boss' | 'api::item.item',
  derived: Map<string, string>,
): Promise<Record<string, string>> => {
  const records = await strapi.db.query(uid).findMany({
    select: ['slug'],
    populate: { grade: { select: ['code'] } },
    orderBy: { slug: 'asc' },
  });

  const out: Record<string, string> = {};

  for (const record of records as { slug: string; grade?: { code: string } }[]) {
    const code = record.grade?.code;
    if (!code) continue;

    // A record the source does not know — created by hand in the panel — has no
    // derived grade to disagree with, so the old test still applies to it.
    const expected = derived.get(record.slug) ?? DEFAULT_GRADE_CODE;
    if (code === expected) continue;

    out[record.slug] = code;
  }

  return out;
};

export const exportCatalogGrades = async (
  strapi: Core.Strapi,
  options: { file?: string; source?: CatalogSource } = {},
): Promise<ExportReport> => {
  const source = options.source ?? readCatalogSource();
  const file = options.file ?? GRADES_FILE;

  const grades: CatalogGrades = {
    bosses: await gradesOf(
      strapi,
      'api::raid-boss.raid-boss',
      new Map(source.bosses.map((boss) => [boss.slug, boss.grade])),
    ),
    items: await gradesOf(
      strapi,
      'api::item.item',
      new Map(source.items.map((item) => [item.slug, item.grade])),
    ),
  };

  fs.writeFileSync(file, `${JSON.stringify(grades, null, 2)}\n`);

  return {
    bosses: Object.keys(grades.bosses).length,
    items: Object.keys(grades.items).length,
    file,
  };
};
