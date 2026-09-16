// Writes the grades set in the database back to `src/helpers/catalog-grades.json`.
//
// Run it after setting grades in the admin panel, and commit the result. The
// seed reads that file, so this is what makes a hand-made correction survive
// the next `pnpm seed:catalog` against a fresh database instead of living in
// one developer's copy.
//
// Only grades that disagree with the rules the seed applies are written — a
// value equal to the derived one would be restated by the next seed anyway, and
// recording it would freeze it against a later change to those rules. The file
// is a diff of what somebody decided, not a dump of the catalogue.
//
// Usage:
//   pnpm --filter backend export:catalog-grades

const path = require('node:path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

// Assembled, not a literal — see the note in `seed-catalog.js`: a literal path
// into `dist/` makes tsc pull its own output back in as input (TS5055).
const EXPORT_MODULE = path.join(__dirname, '..', 'dist', 'src', 'helpers', 'catalog-export');

const main = async () => {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const { exportCatalogGrades } = require(EXPORT_MODULE);
    const report = await exportCatalogGrades(app);

    console.info('export-catalog-grades: wrote %s', path.relative(process.cwd(), report.file));
    console.info('  bosses set against the rule : %d', report.bosses);
    console.info('  items set against the rule   : %d', report.items);

    if (!report.bosses && !report.items) {
      console.info('  (nothing disagrees with the derived grades — nothing to preserve)');
    }
  } finally {
    await app.destroy();
  }
};

main().catch((error) => {
  console.error('export-catalog-grades failed:', error);
  process.exit(1);
});
