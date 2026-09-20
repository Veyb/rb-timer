// Removes the catalogue records the source has stopped listing.
//
// Reports and removes nothing unless `--delete` is passed. The flag is spelt
// out rather than shared with the refreshes' `--write` so that it reads as what
// it is in a shell history: this is the one command here that takes something
// away.
//
// Boots Strapi rather than talking to PostgreSQL directly, for the same reason
// the seed does: deletion runs through the Document Service so the lifecycles
// apply. The work lives in `src/helpers/catalog-prune.ts`; this is the runner.
//
// Usage:
//   pnpm --filter backend prune:catalog          report only
//   pnpm --filter backend prune:catalog:delete   remove what it listed

const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const { nextStep } = require('./catalogue/steps');

// Assembled rather than written as a literal; see `seed-catalog.js` for why.
const PRUNE_MODULE = path.join(__dirname, '..', 'dist', 'src', 'helpers', 'catalog-prune');

const SAMPLE = 20;

const list = (label, names) => {
  console.info('  %s: %d', label, names.length);
  for (const name of names.slice(0, SAMPLE)) console.info('      %s', name);
  if (names.length > SAMPLE) console.info('      ... and %d more', names.length - SAMPLE);
};

const main = async () => {
  const deleting = process.argv.includes('--delete');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const { pruneCatalog } = require(PRUNE_MODULE);
    const report = await pruneCatalog(app, { deleting });

    console.info('prune-catalog: %s', deleting ? 'removed' : 'would remove');
    list('drops the source no longer states', report.drops);
    list('bosses the source no longer lists', report.bosses);
    list('items nothing drops any more', report.items);

    if (report.keptByHand.length) {
      list('kept because someone set a grade by hand', report.keptByHand);
    }

    console.info('  media: untouched, always');

    nextStep('prune', deleting);
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error('prune-catalog failed:', error.message);
  process.exit(1);
});
