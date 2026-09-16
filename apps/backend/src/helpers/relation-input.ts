/**
 * Reading relation ids out of whatever a caller wrote.
 *
 * A relation input arrives in different shapes depending on who writes it: a
 * bare id from a script or a seed, `{ id }` from a populated read fed back in,
 * and `{ set: [...] }` / `{ connect: [...] }` / `{ disconnect: [...] }` from the
 * admin panel's relation editor. Collecting ids out of whatever turned up beats
 * betting on one shape — guessing wrong fails open in the lifecycles that use
 * this, and the constraint they guard stops holding.
 */

export type RelationId = number | string;

export const collectRelationIds = (value: unknown): RelationId[] => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'number' || typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectRelationIds);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('id' in record) return collectRelationIds(record.id);
    if ('documentId' in record) return collectRelationIds(record.documentId);

    return [...collectRelationIds(record.set), ...collectRelationIds(record.connect)];
  }

  return [];
};

/** Ids named under `disconnect`, which `collectRelationIds` deliberately ignores. */
export const collectDisconnectedIds = (value: unknown): RelationId[] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];

  return collectRelationIds((value as Record<string, unknown>).disconnect);
};

/**
 * Whether the write replaces the whole list rather than adding to it. `set` and
 * a bare array both mean "these and no others"; `connect` means "these as
 * well". The difference decides what the resulting list is, and so whether a
 * constraint checked against the existing rows still applies to them.
 */
export const replacesWholeList = (value: unknown): boolean => {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;

  return 'set' in (value as Record<string, unknown>);
};

/** Matches on `id` for a numeric id and on `documentId` for a Strapi cuid. */
export const idFilter = (id: RelationId) =>
  /^\d+$/.test(String(id)) ? { id: Number(id) } : { documentId: String(id) };
