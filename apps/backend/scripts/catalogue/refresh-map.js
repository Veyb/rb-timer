// Refreshes where each boss sits on the source's map. One request per boss.
//
// The source draws the pin with inline CSS on a fixed-size image:
//
//   <img class="map-bg" style="width: 3004px; height: 3004px;">
//   <span class="spawn-point" style="top: 2527.9548022599px; left: 1557.9096045198px">
//
// so `left` and `top` are the coordinates, in pixels of that image. They are
// stored as `wikiX`/`wikiY` — not world coordinates, which this source does not
// publish at all.
//
// The pins are read from the other server's pages, not this one's. Position is
// geography rather than a per-server parameter, and the two agree to the tenth
// decimal — checked on a sample of four bosses that carry a pin on both. This
// server's pages omit the pin for 49 of the 158; the other server's omit none,
// so reading them directly is one pass instead of a pass and a repair.
//
// The map's size is checked on every page rather than assumed. A pin's position
// only means anything against the image it is drawn on, so a different size
// would silently reinterpret all 158 of them.
//
// A `--write` run also fetches that image, once, if the catalogue has no copy —
// see `ensureMap` for why the world map already in the repository is not it.
//
// Usage:
//   pnpm --filter backend refresh:map               report only
//   pnpm --filter backend refresh:map:write           apply to data-wiki.ts
//   pnpm --filter backend refresh:map -- --cache=2026-09-19     read an older copy
//   pnpm --filter backend refresh:map -- --limit=30

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

const { announceCopy, copyFromArgv, createSession, SERVER } = require('./fetch');
const { parseArticle } = require('./parse-article');
const { nextStep } = require('./steps');
const { replaceExport, stampSource } = require('./serialize');
const { createProgress } = require('./progress');

const ARTICLE = `/${SERVER}/posts/post/385-raid-bosses`;
const OTHER_SERVER = 'lu4-gamma';
const MOCKS = path.join(__dirname, '..', '..', 'mocks', 'raid-bosses');
const BOSSES_FILE = path.join(MOCKS, 'data-wiki.ts');
const WIKI_MAP_FILE = path.join(MOCKS, 'images', 'world-map', 'wiki-map.webp');

/** The map every pin is placed on. Pixels mean nothing without it. */
const MAP_SIZE = 3004;

const readBosses = () => {
  const script = fs
    .readFileSync(BOSSES_FILE, 'utf8')
    .replace(/^import[^;]+;$/gm, '')
    .replace(/export const (\w+)\s*(?::[^=]+)?=/g, 'const $1 =')
    .concat('\n;({ RAID_BOSSES })');

  return vm.runInNewContext(script, Object.create(null), { timeout: 30000 }).RAID_BOSSES;
};

/**
 * The one pin on a spawn page.
 *
 * More than one is not something to pick from: the catalogue holds a single
 * position per boss because the game gives a boss one spawn, and a second pin
 * would mean that assumption is wrong. It stops rather than taking the first.
 */
const parseSpawn = (html, slug) => {
  const size = html.match(/class="map-bg"[^>]*style="width:\s*(\d+)px/);
  if (!size) throw new Error(`${slug}: no map image on the spawn page`);
  if (Number(size[1]) !== MAP_SIZE) {
    throw new Error(
      `${slug}: the map is ${size[1]}px, not ${MAP_SIZE}px. Every stored coordinate is ` +
        'a pixel of the old one and would have to be rescaled.',
    );
  }

  const points = [
    ...html.matchAll(/class="spawn-point"[^>]*style="top:\s*([\d.]+)px;\s*left:\s*([\d.]+)px/g),
  ];

  if (!points.length) return null;
  if (points.length > 1) {
    throw new Error(
      `${slug}: ${points.length} spawn points. The catalogue holds one position per boss; ` +
        'this needs a decision before it can be stored.',
    );
  }

  return { wikiY: Number(points[0][1]), wikiX: Number(points[0][2]) };
};

/**
 * The map itself, fetched once and stored at the size the pins are placed on.
 *
 * The catalogue holds a world map already, but a different one — 3072x4096,
 * assembled by hand, and what `mapX`/`mapY` are measured against. A pin's
 * `left` and `top` mean nothing against it, so without this file the 158
 * coordinates this pass refreshes point at an image nobody has.
 *
 * Stored at exactly `MAP_SIZE` square rather than at whatever the source serves,
 * so that a stored coordinate is literally a pixel of the stored image and no
 * scale factor has to travel with it. The path is read from the page rather
 * than written down here: it carries an asset hash that changes when the file
 * does.
 */
const ensureMap = async (session, html) => {
  if (fs.existsSync(WIKI_MAP_FILE)) return false;

  const src = html.match(/<img\s+src="([^"]+)"[^>]*class="map-bg"/);
  if (!src) throw new Error('the spawn page names no map image');

  const jpeg = await session.getBuffer(src[1]);
  if (!jpeg.length) throw new Error(`${src[1]}: empty response`);

  const { width, height } = await sharp(jpeg).metadata();
  const webp = await sharp(jpeg).resize(MAP_SIZE, MAP_SIZE, { fit: 'fill' }).webp().toBuffer();

  fs.mkdirSync(path.dirname(WIKI_MAP_FILE), { recursive: true });
  const staging = `${WIKI_MAP_FILE}.partial`;
  fs.writeFileSync(staging, webp);
  fs.renameSync(staging, WIKI_MAP_FILE);

  console.info(
    '  map: %s, %dx%d -> %dx%d webp (%d KB)',
    src[1],
    width,
    height,
    MAP_SIZE,
    MAP_SIZE,
    Math.round(webp.length / 1024),
  );

  return true;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const session = createSession({ copy: copyFromArgv(argv) });
  announceCopy(session, { expected: 158 });

  const roster = parseArticle(await session.getCached(ARTICLE));
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY;

  console.info("%d bosses; reading each one's spawn\n", roster.length);

  const spawns = new Map();
  const progress = createProgress(roster.length, 'spawns read');
  let fetchedThisRun = 0;
  /** Any spawn page will do; they all name the same map. */
  let aSpawnPage = '';

  for (const boss of roster) {
    const route = `/${OTHER_SERVER}/npc/spawn/${boss.slug}`;
    const cached = fs.existsSync(session.cachePath(route));
    if (!cached && fetchedThisRun >= limit) {
      console.info(
        '  --limit reached; %d bosses left for a later run',
        roster.length - spawns.size,
      );
      break;
    }
    if (!cached) fetchedThisRun++;

    const html = await session.getCached(route);
    aSpawnPage ||= html;

    const spawn = parseSpawn(html, boss.slug);
    if (spawn) spawns.set(boss.id, spawn);
    else console.warn('  %s states no spawn point', boss.name);
    progress.tick(boss.name);
  }

  progress.finish();

  const current = readBosses();
  const moved = [];
  const sharpened = [];
  const missing = [];

  for (const boss of current) {
    const spawn = spawns.get(boss.id);
    if (!spawn) {
      missing.push(boss.name);
      continue;
    }

    // A difference under half a pixel is this file's rounding, not a move.
    const drift = Math.max(Math.abs(spawn.wikiX - boss.wikiX), Math.abs(spawn.wikiY - boss.wikiY));
    if (drift >= 0.5) {
      moved.push(`${boss.name}: ${boss.wikiX}/${boss.wikiY} -> ${spawn.wikiX}/${spawn.wikiY}`);
    } else if (drift > 0) {
      sharpened.push(boss.name);
    }
  }

  console.info('  read           %d of %d', spawns.size, roster.length);
  console.info('  moved          %d', moved.length);
  for (const line of moved.slice(0, 10)) console.info('      %s', line);
  if (moved.length > 10) console.info('      ... and %d more', moved.length - 10);
  console.info('  only sharpened %d  (agree within half a pixel)', sharpened.length);
  console.info('  not read yet   %d', missing.length);
  console.info('  map            %s', fs.existsSync(WIKI_MAP_FILE) ? 'held' : 'not held yet');

  if (!argv.includes('--write')) {
    nextStep('map', false);
    return;
  }

  if (missing.length) {
    throw new Error(
      `${missing.length} bosses have no spawn read yet. Run again, with a larger --limit or none, ` +
        'until every boss is cached; writing part of them would leave the file half current.',
    );
  }

  console.info('\napplying');
  if (!(await ensureMap(session, aSpawnPage))) console.info('  map: already held');

  for (const boss of current) {
    const spawn = spawns.get(boss.id);
    boss.wikiX = spawn.wikiX;
    boss.wikiY = spawn.wikiY;
  }

  fs.writeFileSync(
    BOSSES_FILE,
    stampSource(
      replaceExport(fs.readFileSync(BOSSES_FILE, 'utf8'), 'RAID_BOSSES', current),
      session.copy,
    ),
  );
  execFileSync('pnpm', ['exec', 'biome', 'format', '--write', BOSSES_FILE], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  });
  console.info(
    '  %d bosses updated -> %s',
    current.length,
    path.relative(process.cwd(), BOSSES_FILE),
  );
  nextStep('map', true);
};

main().catch((error) => {
  console.error('refresh:map failed:', error.message);
  process.exit(1);
});
