// global modules
import qs from 'qs';

// local modules
import type { BossDrop, Meta, RaidBoss } from '../../types';
import { apiGetList } from './base';

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

export async function getRaidBossPage(page = 1) {
  return apiGetList<RaidBoss>(`/raid-bosses?${listQuery(page)}`);
}

/** Every boss, page by page. 153 of them, so two requests at the current size. */
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
        resistances: true,
        vulnerabilities: true,
        elementModifiers: true,
        statModifiers: true,
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
 * Fetched per boss rather than alongside the list. Populating drops for all 153
 * at once weighs about 450 KB before icons and grades are added to each item;
 * one boss is 3.4 KB, and nobody hovers over more than a handful of rows.
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
