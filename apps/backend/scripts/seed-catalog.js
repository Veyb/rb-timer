// Loads the raid-boss catalogue into the database.
//
// Boots a Strapi instance rather than talking to PostgreSQL directly, unlike
// the other scripts here: the seed writes components, media relations and the
// boss-and-item pair the `BossDrop` lifecycle guards, none of which is a plain
// insert. The work itself lives in `src/helpers/catalog-seed.ts`; this file is
// the runner.
//
// Idempotent. Every record is matched on a key that never changes — a grade's
// code, a slug, a game id, a boss-and-item pair — and updated in place, so a
// second run leaves the row counts where they were. Images are matched by
// filename before uploading, because Strapi does not deduplicate and a careless
// re-run would add a second copy of every image the catalogue uses.
//
// Usage:
//   pnpm --filter backend seed:catalog

const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const { nextStep } = require('./catalogue/steps');

// Assembled rather than written as a literal, and deliberately so. `allowJs` is
// on and this file is inside the tsconfig's `include`, so a literal
// `require('../dist/...')` makes tsc follow the path and pull the compiled
// output back in as *input* — which is its own output directory, and TS5055.
// `exclude` does not help: it filters the initial glob, not files reached
// through an import.
const SEED_MODULE = path.join(__dirname, '..', 'dist', 'src', 'helpers', 'catalog-seed');

const main = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const { seedCatalog } = require(SEED_MODULE);

    const started = Date.now();
    const report = await seedCatalog(app);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    console.info('seed-catalog: done in %ss', seconds);
    console.info('  source read on %s', report.sourceReadOn ?? '(not recorded)');
    console.info('  grades    : %d', report.grades);
    console.info('  skills    : %d', report.skills);
    console.info('  locations : %d', report.locations);
    console.info('  avatars   : %d', report.avatars);
    console.info('  items     : %d', report.items);
    console.info('  bosses    : %d', report.bosses);
    console.info('  drops     : %d', report.drops);
    console.info('  images    : %d uploaded, %d already present', report.uploaded, report.reused);
    nextStep('seed', true);
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error('seed-catalog failed:', error);
  process.exit(1);
});
