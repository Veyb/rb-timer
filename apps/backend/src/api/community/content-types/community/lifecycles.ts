import { errors } from '@strapi/utils';

const { ValidationError } = errors;

const FILE_UID = 'plugin::upload.file';

/**
 * A media input arrives in different shapes depending on who writes it: a bare
 * id from a script or a seed, `{ id }` from a populated read fed back in, and
 * `{ set: [...] }` / `{ connect: [...] }` from the admin panel's relation
 * editor. Collect ids out of whatever turned up instead of betting on one
 * shape — guessing wrong here fails open, and the constraint stops holding.
 */
const collectFileIds = (value: unknown): (number | string)[] => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'number' || typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectFileIds);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('id' in record) return collectFileIds(record.id);
    if ('documentId' in record) return collectFileIds(record.documentId);

    return [...collectFileIds(record.set), ...collectFileIds(record.connect)];
  }

  return [];
};

const findFile = async (id: number | string) => {
  const where = /^\d+$/.test(String(id)) ? { id: Number(id) } : { documentId: String(id) };

  return strapi.db.query(FILE_UID).findOne({ where });
};

/**
 * Strapi has no aspect-ratio validation, and the dimension check on the admin
 * panel's own logo upload is browser-side code on a bespoke settings screen
 * (`ApplicationInfo/utils/files.js`) that the media field does not share. This
 * runs server-side instead, so it holds for the Content Manager, for a script
 * and for any future upload path alike.
 */
const assertSquareLogo = async (data: Record<string, unknown> | undefined) => {
  if (!data || !('logo' in data)) return;

  for (const id of collectFileIds(data.logo)) {
    const file = await findFile(id);

    if (!file) continue;

    const { width, height } = file;

    // Formats without intrinsic dimensions — SVG above all — report null. There
    // is nothing to compare, and they scale into whatever box they are given.
    if (typeof width !== 'number' || typeof height !== 'number') continue;

    if (width !== height) {
      throw new ValidationError(
        `A community logo must be square, but "${file.name}" is ${width}x${height}`,
      );
    }
  }
};

export default {
  async beforeCreate(event) {
    await assertSquareLogo(event.params.data);
  },

  async beforeUpdate(event) {
    await assertSquareLogo(event.params.data);
  },
};
