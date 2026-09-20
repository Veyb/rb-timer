// global modules
import qs from 'qs';

// local modules
import type { BossDrop, Maps, Meta, RaidBoss } from '../../types';
import { apiGet, apiGetList } from './base';

/**
 * No `authHeaders` anywhere in this file, and that is the point rather than an
 * omission: the catalogue is game reference data granted to the `public` role,
 * so it answers a request carrying no credentials. Sending a header would work
 * too — every signed-in role holds the same read — but taking a token here
 * would quietly make the catalogue look like it needs one.
 */

const listQuery = (page: number) =>
  qs.stringify(
    {
      // `grade.order` and not `grade`: an enumeration would have sorted
      // alphabetically, which is why grade is a record with an explicit rank.
      sort: ['level:asc', 'name:asc'],
      pagination: { page, pageSize: 100 },
      populate: {
        grade: true,
        location: true,
        avatar: { populate: { mini: true } },
      },
    },
    { encodeValuesOnly: true },
  );

/**
 * The two maps the catalogue's coordinates are measured on.
 *
 * A single type, so the response is one object rather than a list, and there is
 * no filtering to do. They are read from here and not by their file URL because
 * that URL carries a suffix Strapi generates at upload time, which changes
 * whenever the catalogue is seeded again.
 *
 * The route is singular — `/map` — because Strapi builds a single type's route
 * from its singular name, the way its own `/api/global` does. There is one
 * record; it holds two maps.
 */
export async function getMaps() {
  const query = qs.stringify(
    { populate: { map: true, wikiMap: true } },
    { encodeValuesOnly: true },
  );

  const { data } = await apiGet<{ data: Maps | null }>(`/map?${query}`);

  return data;
}

export async function getRaidBossPage(page = 1) {
  return apiGetList<RaidBoss>(`/raid-bosses?${listQuery(page)}`);
}

/** Every boss, page by page — there are more of them than one page holds. */
export async function getRaidBossList() {
  const { data: first, meta: firstMeta } = await getRaidBossPage();

  let list = [...first];
  let meta: Meta = firstMeta;
  let page = 1;

  while (meta.pageCount > page) {
    const { data, meta: pageMeta } = await getRaidBossPage(++page);
    list = [...list, ...data];
    meta = pageMeta;
  }

  return { data: list, meta };
}

export async function getRaidBoss(slug: string) {
  const query = qs.stringify(
    {
      filters: { slug: { $eq: slug } },
      populate: {
        grade: true,
        avatar: { populate: { full: true, mini: true } },
        location: { populate: { dungeon: { populate: { image: true } } } },
        respawn: true,
        respawnSchedule: true,
        stats: true,
        // The modifier lists have to be named: Strapi returns a component list
        // as an empty array unless it is populated, so `skills: true` alone
        // would give every skill and nothing it says.
        skills: {
          populate: {
            icon: true,
            weaponModifiers: true,
            elementModifiers: true,
            statModifiers: true,
            conditionModifiers: true,
          },
        },
        drops: { populate: { item: { populate: { icon: true, grade: true } } } },
      },
    },
    { encodeValuesOnly: true },
  );

  const { data } = await apiGetList<RaidBoss>(`/raid-bosses?${query}`);

  return data[0] ?? null;
}

/**
 * One boss's drops, richest first.
 *
 * Fetched per boss rather than alongside the list. Populating drops for the
 * whole catalogue at once runs to hundreds of kilobytes before icons and grades
 * are added to each item; one boss is a few, and nobody hovers over more than a
 * handful of rows.
 */
export async function getBossDrops(bossDocumentId: string) {
  const query = qs.stringify(
    {
      filters: { raidBoss: { documentId: { $eq: bossDocumentId } } },
      sort: ['chance:desc'],
      fields: ['chance', 'minCount', 'maxCount'],
      populate: {
        item: {
          fields: ['name', 'slug'],
          populate: { icon: { fields: ['url'] }, grade: { fields: ['label', 'order'] } },
        },
      },
      pagination: { pageSize: 100 },
    },
    { encodeValuesOnly: true },
  );

  const { data } = await apiGetList<BossDrop>(`/boss-drops?${query}`);

  return data;
}
