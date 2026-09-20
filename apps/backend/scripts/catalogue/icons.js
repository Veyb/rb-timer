// Fetches the icons the catalogue names but does not hold.
//
// The catalogue stores an icon by key — `etc_broken_crystal_red_i00` — and the
// seed uploads the file at the path that key implies. So a key with no file is
// not a cosmetic gap: `uploadOnce` reads it and the seed dies partway through,
// after it has already written records.
//
// The source serves every one of them at `/i64/<key>.png`, which makes this a
// hole the refresh can close itself. It fetches only what is missing, so the
// second run of any refresh asks for nothing.
//
// Used by the refresh commands; not a command itself.

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const { RefusedError } = require('./fetch');

/** What the catalogue's existing icons are: 470 of them, all this size. */
const SIZE = 64;

/**
 * Makes sure every key has a `.webp` in `dir`, fetching and converting the ones
 * that do not, through the caller's session so that the pacing and the refusal
 * handling are the ones everything else obeys.
 *
 * Writes through a temporary file: a half-written icon is worse than a missing
 * one, because the next run would see it and skip it.
 */
const ensureIcons = async (session, keys, dir) => {
  const missing = [...new Set(keys)]
    .filter(Boolean)
    .filter((key) => !fs.existsSync(path.join(dir, `${key}.webp`)));

  if (!missing.length) return { fetched: [], failed: [] };

  fs.mkdirSync(dir, { recursive: true });

  const fetched = [];
  const failed = [];

  for (const key of missing) {
    try {
      const png = await session.getBuffer(`/i64/${key}.png`);
      if (!png.length) throw new Error('empty response');

      const webp = await sharp(png).resize(SIZE, SIZE, { fit: 'inside' }).webp().toBuffer();

      const target = path.join(dir, `${key}.webp`);
      const staging = `${target}.partial`;
      fs.writeFileSync(staging, webp);
      fs.renameSync(staging, target);

      fetched.push(key);
    } catch (error) {
      // A refusal is not this icon's problem and must not be absorbed into a
      // per-icon tally: carrying on would ask the host for the next one while
      // it is telling us to stop.
      if (error instanceof RefusedError) throw error;
      failed.push(`${key}: ${error.message}`);
    }
  }

  return { fetched, failed };
};

/** Reports the outcome, and refuses to call a run successful when one failed. */
const reportIcons = (label, { fetched, failed }) => {
  if (fetched.length) console.info('  %s: %d icons fetched and converted', label, fetched.length);
  if (!fetched.length && !failed.length) console.info('  %s: none missing', label);

  if (failed.length) {
    console.error('  %s: %d could not be fetched:', label, failed.length);
    for (const line of failed) console.error('    %s', line);
    throw new Error(`${failed.length} icons are still missing; the seed would fail on them`);
  }
};

module.exports = { SIZE, ensureIcons, reportIcons };
