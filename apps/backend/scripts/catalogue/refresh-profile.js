// Refreshes what only a boss's own page states. One request per boss.
//
// The deep refresh: level, race, all ten statistics, respawn, the soul-crystal
// level and the skills a boss carries. Run it when the game has patched, not on
// a schedule — it asks the source for 158 pages, and `robots.txt` asks us not
// to crawl at all.
//
// Every page is read under our server's prefix. The links in the article point
// at the other server, and following them would quietly import its numbers: the
// two disagree on level and on every statistic for the epics and the four
// subclass bosses.
//
// Usage:
//   pnpm --filter backend refresh:profile             report only
//   pnpm --filter backend refresh:profile:write       apply to data-wiki.ts
//   pnpm --filter backend refresh:profile -- --cache=2026-09-19  read an older copy
//   pnpm --filter backend refresh:profile -- --limit=30  read only 30 new pages

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const { announceCopy, copyFromArgv, createSession, SERVER } = require('./fetch');
const { parseArticle } = require('./parse-article');
const { nextStep } = require('./steps');
const { parseBoss } = require('./parse-boss');
const { parseBossSkills } = require('./parse-skills');
const { replaceExport, stampSource } = require('./serialize');
const { createProgress } = require('./progress');

const ARTICLE = `/${SERVER}/posts/post/385-raid-bosses`;
const OTHER_SERVER = 'lu4-gamma';
const OURS_FILE = path.join(__dirname, '..', '..', 'mocks', 'raid-bosses', 'data-wiki.ts');

const readBosses = () => {
  const source = fs.readFileSync(OURS_FILE, 'utf8');

  return vm.runInNewContext(
    source
      .replace(/^import[^;]+;$/gm, '')
      .replace(/export const (\w+)\s*(?::[^=]+)?=/g, 'const $1 =')
      .concat('\n;({ RAID_BOSSES })'),
    Object.create(null),
    { timeout: 30000 },
  ).RAID_BOSSES;
};

/**
 * Deep equality that does not care about key order.
 *
 * `JSON.stringify` does care, and the source states the statistics in a
 * different order than the file holds them — which reported all 69 bosses as
 * changed while the list of changed fields was empty for every one of them.
 */
const same = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((entry, i) => same(entry, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];

    return keys.every((key) => same(a[key], b[key]));
  }

  return a === b;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const session = createSession({ copy: copyFromArgv(argv) });
  announceCopy(session, { expected: 158 });

  const roster = parseArticle(await session.getCached(ARTICLE));

  // `--limit N` reads only the first N bosses not already cached, so a pass
  // over the whole roster can be taken in several sittings instead of one
  // conspicuous burst. What is cached is never re-fetched, so the next run
  // carries on where this one stopped.
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY;
  let fetchedThisRun = 0;
  console.info('%d bosses on the roster; reading each one\n', roster.length);

  const profiles = new Map();
  const noRespawn = [];
  const progress = createProgress(roster.length, 'bosses read');

  for (const boss of roster) {
    const cached = fs.existsSync(session.cachePath(`/${SERVER}/npc/${boss.slug}`));
    if (!cached && fetchedThisRun >= limit) {
      console.info(
        '  --limit reached; %d bosses left for a later run',
        roster.length - profiles.size,
      );
      break;
    }
    if (!cached) fetchedThisRun++;

    const html = await session.getCached(`/${SERVER}/npc/${boss.slug}`);
    const profile = parseBoss(html);
    // Only the skills the catalogue holds — the ones that say something about
    // a fight. `parse-skills.js` owns that judgement; taking every link on the
    // page instead left each boss pointing at lore and neutral descriptors.
    profile.skills = parseBossSkills(html)
      .map((skill) => skill.key)
      .sort();

    // The source omits respawn for some bosses under this server while
    // publishing it for the other. Their defect, not a real difference, so the
    // other server's page answers for this one field only.
    if (!profile.respawn) {
      const other = parseBoss(await session.getCached(`/${OTHER_SERVER}/npc/${boss.slug}`));
      profile.respawn = other.respawn;
      noRespawn.push(
        `${boss.name}${other.respawn ? ` (took ${other.respawn.raw})` : ' (neither server states it)'}`,
      );
    }

    profiles.set(boss.id, profile);
    progress.tick(boss.name);
  }

  progress.finish();

  const current = readBosses();
  const known = new Set(current.map((boss) => boss.id));

  const diff = { level: [], race: [], stats: [], respawn: [], sa: [], skills: [] };
  const unparsed = [];
  const incomplete = [];
  const newBosses = [];
  const groups = new Map();

  for (const boss of roster) {
    const profile = profiles.get(boss.id);
    // A run stopped by `--limit` has read only part of the roster; the rest are
    // not differences, they are simply unread.
    if (!profile) continue;

    for (const key of profile.skills) {
      const group = key.split('-')[0];
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }

    if (!profile.stats) incomplete.push(boss.name);
    if (profile.respawn?.unparsed) unparsed.push(`${boss.name}: ${profile.respawn.raw}`);

    if (!known.has(boss.id)) {
      newBosses.push(
        `${boss.name} — location "${profile.location.name ?? '?'}" (${profile.location.slug ?? '?'})`,
      );
      continue;
    }

    const mine = current.find((entry) => entry.id === boss.id);
    if (profile.level && profile.level !== mine.level) {
      diff.level.push(`${mine.name}: ${mine.level} -> ${profile.level}`);
    }
    if (profile.race && profile.race.toLowerCase() !== mine.race.toLowerCase()) {
      diff.race.push(`${mine.name}: ${mine.race} -> ${profile.race}`);
    }
    if (profile.stats && !same(profile.stats, mine.stats)) {
      const fields = Object.keys(profile.stats).filter(
        (key) => profile.stats[key] !== mine.stats[key],
      );
      diff.stats.push(`${mine.name}: ${fields.join(', ')}`);
    }
    if (profile.respawn && profile.respawn.raw !== mine.respawn.raw) {
      diff.respawn.push(`${mine.name}: ${mine.respawn.raw} -> ${profile.respawn.raw}`);
    }
    if ((profile.saMaxLevel ?? null) !== (mine.saMaxLevel ?? null)) {
      diff.sa.push(`${mine.name}: ${mine.saMaxLevel ?? 'none'} -> ${profile.saMaxLevel ?? 'none'}`);
    }
    if (!same(profile.skills, mine.skills ?? [])) {
      diff.skills.push(`${mine.name}: ${(mine.skills ?? []).length} -> ${profile.skills.length}`);
    }
  }

  const sample = (label, list) => {
    // Padded here rather than with a `%-16s`: that is printf, and Node's
    // formatter leaves it alone and then has a spare argument to print.
    console.info('  %s %d', label.padEnd(14), list.length);
    for (const line of list.slice(0, 6)) console.info('      %s', line);
    if (list.length > 6) console.info('      ... and %d more', list.length - 6);
  };

  sample('level', diff.level);
  sample('race', diff.race);
  sample('statistics', diff.stats);
  sample('respawn', diff.respawn);
  sample('soul crystal', diff.sa);
  sample('skills', diff.skills);

  console.info('\n  skill groups seen: %d', groups.size);
  console.info(
    '      %s',
    [...groups]
      .sort((a, b) => b[1] - a[1])
      .map(([group, n]) => `${group} (${n})`)
      .join('  '),
  );

  if (noRespawn.length) {
    console.warn(
      '\n  %d bosses state no respawn on this server; read from the other:',
      noRespawn.length,
    );
    for (const line of noRespawn.slice(0, 8)) console.warn('      %s', line);
  }
  if (newBosses.length) {
    console.warn(
      '\n  %d BOSSES ARE NEW. Their locations come from the source and are',
      newBosses.length,
    );
    console.warn('  transliterated; give them names of their own before anyone reads them:');
    for (const line of newBosses) console.warn('      %s', line);
  }
  if (unparsed.length) {
    console.error('\n  %d respawn strings were not understood:', unparsed.length);
    for (const line of unparsed) console.error('      %s', line);
  }
  if (incomplete.length) {
    throw new Error(
      `${incomplete.length} bosses did not yield all ten statistics: ${incomplete.slice(0, 5).join(', ')}`,
    );
  }

  if (!argv.includes('--write')) {
    nextStep('profile', false);
    return;
  }

  // A partial pass must not write. Half a refresh leaves the file in a state
  // nothing records — some bosses current, some not, and no way to tell which
  // from the file itself. Finish the reading first, in as many sittings as it
  // takes; the cache makes that free.
  if (profiles.size < roster.length) {
    throw new Error(
      `only ${profiles.size} of ${roster.length} bosses have been read. ` +
        'Run again without --limit, or with more of them, until every boss is cached.',
    );
  }

  console.info('\napplying');
  let touched = 0;

  for (const boss of current) {
    const profile = profiles.get(boss.id);
    if (!profile) continue;

    if (profile.level) boss.level = profile.level;
    if (profile.race) boss.race = profile.race;
    if (profile.stats) boss.stats = profile.stats;
    if (profile.respawn) boss.respawn = { ...profile.respawn, unparsed: undefined };
    boss.saMaxLevel = profile.saMaxLevel ?? undefined;
    boss.skills = profile.skills;
    // `locations` is deliberately untouched: see `parse-boss.js`.
    touched++;
  }

  fs.writeFileSync(
    OURS_FILE,
    stampSource(
      replaceExport(fs.readFileSync(OURS_FILE, 'utf8'), 'RAID_BOSSES', current),
      session.copy,
    ),
  );
  execFileSync('pnpm', ['exec', 'biome', 'format', '--write', OURS_FILE], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  });
  console.info('  %d bosses updated -> %s', touched, path.relative(process.cwd(), OURS_FILE));
  nextStep('profile', true);
};

main().catch((error) => {
  console.error('refresh:profile failed:', error.message);
  process.exit(1);
});
