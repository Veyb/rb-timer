import { errors } from '@strapi/utils';

import { collectRelationIds, idFilter } from '../../../../helpers/relation-input';

const { ValidationError } = errors;

const DROP_UID = 'api::boss-drop.boss-drop';

/**
 * Guards a drop edited as a drop. The other half of the constraint lives in the
 * raid boss's lifecycle, because a drop attached from inside a boss never
 * reaches this file with a `raidBoss` to check.
 */
interface Pair {
  bossId?: number | string;
  itemId?: number | string;
  boss?: { id: number; name: string };
  item?: { id: number; name: string };
}

/**
 * The boss and item this row will end up joined to, which is not the same as
 * the ones named in the request.
 *
 * An update that changes only the item carries only `item`, and reading the
 * pair from the request alone would leave the boss undefined — which would skip
 * both the duplicate check and the label, silently, on exactly the edit most
 * likely to create a duplicate. So the half the request does not mention is
 * read off the row being updated.
 */
const effectivePair = async (
  data: Record<string, unknown>,
  excludeId?: number | string,
): Promise<Pair> => {
  const [fromData_boss] = collectRelationIds(data.raidBoss);
  const [fromData_item] = collectRelationIds(data.item);

  let bossId = fromData_boss;
  let itemId = fromData_item;

  if ((bossId === undefined || itemId === undefined) && excludeId !== undefined) {
    const current = await strapi.db.query(DROP_UID).findOne({
      where: { id: Number(excludeId) },
      populate: { raidBoss: true, item: true },
    });

    bossId ??= current?.raidBoss?.id;
    itemId ??= current?.item?.id;
  }

  if (bossId === undefined || itemId === undefined) return {};

  const [boss, item] = await Promise.all([
    strapi.db.query('api::raid-boss.raid-boss').findOne({ where: idFilter(bossId) }),
    strapi.db.query('api::item.item').findOne({ where: idFilter(itemId) }),
  ]);

  return { bossId, itemId, boss: boss ?? undefined, item: item ?? undefined };
};

/**
 * A boss drops a given item once. The pair is the identity of the row, and the
 * chance and quantity range are what it carries — a second row for the same
 * pair is not a second drop but a contradiction, and reading a boss would show
 * the item twice with two different chances.
 *
 * Enforced here rather than by a unique index because the pair spans two link
 * tables (`boss_drops_raid_boss_lnk` and `boss_drops_item_lnk`), so there is no
 * single column pair for the database to constrain. It holds for the Content
 * Manager, the Content API and the seed alike, which is what matters: the seed
 * writes 2791 of these and re-runs are expected.
 */
const assertPairIsFree = async (pair: Pair, excludeId?: number | string) => {
  if (!pair.boss || !pair.item) return;

  const filters: Record<string, unknown> = {
    raidBoss: { id: pair.boss.id },
    item: { id: pair.item.id },
  };

  if (excludeId !== undefined) {
    filters.id = { $ne: Number(excludeId) };
  }

  const existing = await strapi.db.query(DROP_UID).findOne({ where: filters });

  if (existing) {
    throw new ValidationError(
      'This raid boss already has a drop for this item; change the existing one instead of adding a second.',
    );
  }
};

/**
 * Names the drop after the two records it joins, so it can identify itself in
 * the admin panel. Every other field here is a number or a relation, and
 * Strapi's fallback for a record with no string attribute is the cuid — which
 * is what the drop list and every drop picker showed before this.
 *
 * Skipped when the caller supplied a label: the seed writes 2791 of these and
 * already holds both names, so it sets them itself rather than paying the
 * lookups here.
 */
const nameAfterItsEnds = (data: Record<string, unknown>, pair: Pair) => {
  if (typeof data.label === 'string' && data.label.length > 0) return;
  if (!pair.boss || !pair.item) return;

  data.label = `${pair.boss.name} — ${pair.item.name}`;
};

/**
 * `required: true` on a relation is an admin-form rule, not a guarantee.
 * Verified against this very schema: with both relations marked required, the
 * Document Service created a drop with no boss, one with no item, and one with
 * neither. So the constraint that actually has to hold is checked here.
 *
 * Only the item, though. A drop created from inside a boss legitimately has no
 * `raidBoss` yet — the link is a write to the boss and lands afterwards — so
 * refusing that here would break the one flow this was all meant to smooth. The
 * boss end is covered by the raid boss's own lifecycle instead.
 */
const assertHasItem = (data: Record<string, unknown>, isCreate: boolean) => {
  const mentioned = Object.hasOwn(data, 'item');

  if (!isCreate && !mentioned) return;

  const [itemId] = collectRelationIds(data.item);

  if (itemId === undefined) {
    throw new ValidationError('A drop must name the item that drops.');
  }
};

export default {
  async beforeCreate(event) {
    const data = event.params.data;
    if (!data) return;

    assertHasItem(data, true);

    const pair = await effectivePair(data);

    await assertPairIsFree(pair);
    nameAfterItsEnds(data, pair);
  },

  async beforeUpdate(event) {
    const data = event.params.data;
    if (!data) return;

    // `where.id` is what the Document Service resolves an update down to. When
    // it is absent the update addresses more than one row: the unnamed half of
    // the pair cannot be read off a single row, and excluding a single id would
    // be wrong, so the check falls back to finding any *other* row with the
    // pair the request does name.
    assertHasItem(data, false);

    const id = event.params.where?.id;
    const pair = await effectivePair(data, id);

    await assertPairIsFree(pair, id);
    nameAfterItsEnds(data, pair);
  },
};
