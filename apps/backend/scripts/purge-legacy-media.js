// Removes the media the withdrawn item collection feature left behind: the
// `files` rows, the morph rows that attached them, and the files on disk.
//
// Written for the `add-raid-boss-catalog` change and meant to be run once. It
// is kept in the tree afterwards because the numbers it prints are the record
// of what was removed, and because a second run against a purged database is a
// no-op that says so.
//
// Two sets are removed, and it is worth knowing why the second one exists:
//
//   * files attached to `api::collection.collection`, `api::item.item` or
//     `api::effect.effect` through `files_related_mph`, and
//   * files attached to nothing at all.
//
// The join only reaches 133 of the 424 rows. The other 291 are orphans — same
// upload batch of February 2022, same game item icons, but the records that
// pointed at them were deleted over the years and Strapi does not collect the
// files when that happens. Removing only the reachable ones would leave the
// larger half behind, which is the opposite of the point.
//
// A file attached to anything else is never touched, so a community logo
// survives whether or not one is set when this runs.
//
// It also sweeps files sitting in `public/uploads` with no `files` row at all —
// two old logo uploads, in practice — since nothing can ever serve those. Any
// dotfile is left alone: `.gitkeep` is what keeps the directory in the tree.
//
// Talks to the database directly rather than through Strapi, following
// `e2e-fixture.js`: booting an instance to delete rows would add nothing. It
// reads the same `.env` the app does.
//
// Usage:
//   node scripts/purge-legacy-media.js            # dry run, prints and exits
//   node scripts/purge-legacy-media.js --apply    # actually deletes

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const LEGACY_TYPES = ['api::collection.collection', 'api::item.item', 'api::effect.effect'];

const apply = process.argv.slice(2).includes('--apply');

/**
 * Minimal `.env` reader. Strapi loads the file itself at boot, but a plain
 * script does not, and `dotenv` is only a transitive dependency here.
 */
const readEnvFile = () => {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at), line.slice(at + 1).replace(/^["']|["']$/g, '')];
      }),
  );
};

const env = { ...readEnvFile(), ...process.env };

if ((env.DATABASE_CLIENT || 'sqlite') !== 'postgres') {
  console.error(
    `purge-legacy-media: expected DATABASE_CLIENT=postgres, got "${env.DATABASE_CLIENT || 'sqlite'}".`,
  );
  process.exit(1);
}

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

/**
 * Every variant Strapi wrote for one file: the original plus whatever
 * `formats` it generated. Collected from the database rather than by guessing
 * at filenames, because the responsive variants carry their own hashes.
 */
const diskNamesFor = (row) => {
  const names = [];
  if (row.url) names.push(path.basename(row.url));

  const formats = row.formats ?? {};
  for (const format of Object.values(formats)) {
    if (format?.url) names.push(path.basename(format.url));
  }

  return names;
};

const main = async () => {
  const client = new Client({
    host: env.DATABASE_HOST || 'localhost',
    port: Number(env.DATABASE_PORT || 5432),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
  });

  await client.connect();

  try {
    const { rows: doomed } = await client.query(
      `select f.id, f.name, f.url, f.formats
         from files f
        where exists (
                select 1 from files_related_mph m
                 where m.file_id = f.id and m.related_type = any($1)
              )
           or not exists (
                select 1 from files_related_mph m where m.file_id = f.id
              )
        order by f.id`,
      [LEGACY_TYPES],
    );

    const { rows: kept } = await client.query(
      `select distinct m.related_type
         from files_related_mph m
        where not (m.related_type = any($1))`,
      [LEGACY_TYPES],
    );

    const { rows: totals } = await client.query('select count(*)::int as n from files');
    const { rows: allFiles } = await client.query('select url, formats from files');

    const diskNames = doomed.flatMap(diskNamesFor);
    const onDisk = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];

    // Anything on disk that no surviving row will name once the doomed rows are
    // gone, minus dotfiles.
    const stillNamed = new Set(
      allFiles.flatMap(diskNamesFor).filter((name) => !diskNames.includes(name)),
    );
    const strays = onDisk.filter((name) => !name.startsWith('.') && !stillNamed.has(name));

    console.info(`purge-legacy-media: ${apply ? 'APPLY' : 'dry run'}`);
    console.info(`  files rows total      : ${totals[0].n}`);
    console.info(`  files rows to remove  : ${doomed.length}`);
    console.info(`  disk files to remove  : ${strays.length} of ${onDisk.length} present`);
    console.info(`    of those, unrecorded: ${strays.length - diskNames.length}`);
    console.info(
      `  media kept for        : ${kept.length ? kept.map((r) => r.related_type).join(', ') : '(nothing else uses media)'}`,
    );

    if (!doomed.length && !strays.length) {
      console.info('purge-legacy-media: nothing to do.');
      return;
    }

    if (!apply) {
      console.info('purge-legacy-media: dry run, nothing removed. Re-run with --apply.');
      return;
    }

    const ids = doomed.map((row) => row.id);

    // Morph rows first: they are what makes a file reachable, and leaving them
    // behind after the file row is gone would leave a dangling reference. The
    // foreign key would cascade, but doing it explicitly keeps the count
    // reportable.
    await client.query('begin');
    const morph = await client.query('delete from files_related_mph where file_id = any($1)', [
      ids,
    ]);
    const files = await client.query('delete from files where id = any($1)', [ids]);
    await client.query('commit');

    let removed = 0;
    let missing = 0;
    for (const name of strays) {
      const file = path.join(UPLOADS_DIR, name);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        removed += 1;
      } else {
        missing += 1;
      }
    }

    console.info(`  morph rows deleted    : ${morph.rowCount}`);
    console.info(`  files rows deleted    : ${files.rowCount}`);
    console.info(
      `  disk files deleted    : ${removed}${missing ? ` (${missing} already absent)` : ''}`,
    );
    console.info(`  disk files remaining  : ${fs.readdirSync(UPLOADS_DIR).length}`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('purge-legacy-media failed:', error.message);
  process.exit(1);
});
