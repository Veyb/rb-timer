import { errors } from '@strapi/utils';

import {
  collectDisconnectedIds,
  collectRelationIds,
  idFilter,
  type RelationId,
  replacesWholeList,
} from '../../../../helpers/relation-input';

const { ValidationError } = errors;

const DROP_UID = 'api::boss-drop.boss-drop';

/**
 * Guards and maintains a boss's drops when they are edited from the boss rather
 * than from the drop.
 *
 * The drop's own lifecycle cannot see this. Attaching a drop to a boss through
 * the boss's relation field is a write to the *boss*, and the link lands after
 * the drop was created — so a drop made from inside a boss reaches
 * `boss-drop`'s `beforeCreate` with no `raidBoss` at all. Measured, not assumed:
 * such a drop ended up with `label = null` and slipped past the pair check
 * entirely, which is the one constraint the catalogue cannot express in the
 * schema.
 *
 * So the boss end guards it too. Two halves, deliberately on either side of the
 * write: the duplicate check refuses before anything is stored, and the labels
 * are written after, once the links actually exist.
 */

interface DropRow {
  id: number;
  label: string | null;
  item?: { id: number; name: string } | null;
}

/** The drops this boss will hold once the write lands. */
const resultingDropIds = async (
  bossId: RelationId,
  dropsInput: unknown,
): Promise<RelationId[] | null> => {
  const named = collectRelationIds(dropsInput);

  if (replacesWholeList(dropsInput)) return named;

  // `connect` adds to what is already there, so the existing rows are part of
  // the result and have to be checked against the newcomers.
  const existing = (await strapi.db.query(DROP_UID).findMany({
    where: { raidBoss: idFilter(bossId) },
    select: ['id'],
  })) as { id: number }[];

  const disconnected = new Set(collectDisconnectedIds(dropsInput).map(String));
  const kept = existing.map((drop) => drop.id).filter((id) => !disconnected.has(String(id)));

  return [...kept, ...named];
};

const loadDrops = async (ids: RelationId[]): Promise<DropRow[]> => {
  if (!ids.length) return [];

  const numeric = ids.filter((id) => /^\d+$/.test(String(id))).map(Number);
  const documents = ids.filter((id) => !/^\d+$/.test(String(id))).map(String);

  const found = await Promise.all([
    numeric.length
      ? strapi.db
          .query(DROP_UID)
          .findMany({ where: { id: { $in: numeric } }, populate: { item: true } })
      : [],
    documents.length
      ? strapi.db
          .query(DROP_UID)
          .findMany({ where: { documentId: { $in: documents } }, populate: { item: true } })
      : [],
  ]);

  return found.flat() as DropRow[];
};

export default {
  async beforeUpdate(event) {
    const data = event.params.data;
    const bossId = event.params.where?.id;

    if (!data || !('drops' in data) || bossId === undefined) return;

    const ids = await resultingDropIds(bossId, data.drops);
    if (!ids || ids.length < 2) return;

    const drops = await loadDrops(ids);
    const seen = new Map<number, string>();

    for (const drop of drops) {
      if (!drop.item) continue;

      const already = seen.get(drop.item.id);
      if (already !== undefined) {
        throw new ValidationError(
          `This boss would end up with two drops for "${drop.item.name}". A boss drops a given item once — change the existing drop instead of adding a second.`,
        );
      }
      seen.set(drop.item.id, drop.item.name);
    }
  },

  /**
   * Written here rather than before the update because a drop connected from
   * this side has no link yet at that point — and because a renamed boss should
   * take its drops' labels with it, which is only knowable once the new name is
   * stored.
   */
  async afterUpdate(event) {
    const data = event.params.data;
    if (!data || !('drops' in data || 'name' in data)) return;

    const bossId = event.result?.id ?? event.params.where?.id;
    if (bossId === undefined) return;

    const boss = (await strapi.db
      .query('api::raid-boss.raid-boss')
      .findOne({ where: idFilter(bossId), select: ['id', 'name'] })) as {
      id: number;
      name: string;
    } | null;

    if (!boss) return;

    const drops = (await strapi.db.query(DROP_UID).findMany({
      where: { raidBoss: { id: boss.id } },
      populate: { item: true },
    })) as DropRow[];

    for (const drop of drops) {
      if (!drop.item) continue;

      const label = `${boss.name} — ${drop.item.name}`;
      if (drop.label === label) continue;

      await strapi.db.query(DROP_UID).update({ where: { id: drop.id }, data: { label } });
    }
  },
};
