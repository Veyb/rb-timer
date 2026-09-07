// Boots a real Strapi instance for integration tests.
//
// Deliberately CommonJS. Strapi's ESM build is not loadable:
// `@strapi/core/dist/index.mjs` does a directory import of `lodash/fp`, which
// Node's ESM loader rejects. Only the CommonJS entry works, and a `.cjs` file
// is the one thing Vite will not rewrite into ESM — so `require` here resolves
// `@strapi/strapi` through its `require` condition and gets the working build.
//
// The rest is plain public API. The official guide
// (https://docs.strapi.io/cms/testing) ships a harness that monkey-patches
// Strapi internals so `.ts` config files load; none of that is needed on 5.52.
// Compiling first is what `strapi develop` does too, and `createStrapi()` takes
// the resulting directory. Two of the guide's three patches are redundant here,
// and the third — remapping the `sqlite` client to `sqlite3` — is wrong for
// this version, where `@strapi/database` already maps `sqlite` to
// `better-sqlite3` (and `sqlite3` is deliberately not installed; see
// pnpm-workspace.yaml).
//
// A run shares nothing with a running `pnpm dev`: its own compile output, its
// own database file, its own port. That is deliberate — `strapi develop`
// deletes `dist/` on every reload ("Cleaning dist dir"), so a suite that
// compiled into the same place would be loading from a directory being removed
// underneath it. Observed failure: `ENOENT` and every test reported as
// *skipped*, which reads like "nothing to run" rather than "the suite never
// started".
const fs = require('node:fs');
const path = require('node:path');

const { createStrapi } = require('@strapi/strapi');
const tsUtils = require('@strapi/typescript-utils');

// Deliberately a sibling of `dist/`, at the same depth. `config/database.ts`
// resolves its path with `path.join(__dirname, '..', '..', ...)`, so a test
// build one level deeper would silently relocate the database — and anything
// else in config that resolves relative to its own location with it.
const TEST_DIST = 'dist-test';

let state;

// Vitest sets the worker's cwd to `test.root`, which defaults to the directory
// holding the vitest config — this package. Asserted rather than assumed, so a
// wrong cwd fails with a legible message instead of a confusing load error.
function resolveAppDir() {
  const appDir = process.cwd();
  const manifest = path.join(appDir, 'package.json');

  if (
    !fs.existsSync(manifest) ||
    JSON.parse(fs.readFileSync(manifest, 'utf8')).name !== 'backend'
  ) {
    throw new Error(
      `Expected the working directory to be apps/backend, got ${appDir}. Run the suite with \`pnpm --filter backend test\`.`,
    );
  }

  return appDir;
}

async function setupStrapi() {
  if (state) return state;

  const appDir = resolveAppDir();

  // `config/database.ts` joins DATABASE_FILENAME onto the app root, so this has
  // to stay relative to apps/backend: an absolute path would be appended to
  // that root and quietly create a directory tree inside the repository.
  // `.tmp/` is already gitignored.
  const relativeDatabaseFile = path.join('.tmp', `test-${process.pid}-${Date.now()}.db`);
  const databaseFile = path.join(appDir, relativeDatabaseFile);
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  // A throwaway database and an ephemeral port, so a run never touches the
  // development database and never collides with a running dev server.
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = relativeDatabaseFile;
  process.env.PORT = '0';
  process.env.APP_KEYS ??= 'testKeyOne,testKeyTwo';
  process.env.API_TOKEN_SALT ??= 'test-api-token-salt';
  process.env.ADMIN_JWT_SECRET ??= 'test-admin-jwt-secret';
  process.env.TRANSFER_TOKEN_SALT ??= 'test-transfer-token-salt';
  process.env.JWT_SECRET ??= 'test-jwt-secret';
  process.env.ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef';
  process.env.STRAPI_DISABLE_CRON = 'true';
  process.env.STRAPI_TELEMETRY_DISABLED = 'true';

  // `compileStrapi()` would emit into the `outDir` from tsconfig — the same
  // `dist/` the dev server wipes on reload. Compile through the same utility it
  // uses, but redirect the output (and its incremental cache) so the suite owns
  // its build entirely. `configOptions.options` is merged over the tsconfig.
  const distDir = path.join(appDir, TEST_DIST);
  await tsUtils.compile(appDir, {
    configOptions: {
      options: {
        incremental: true,
        outDir: distDir,
        tsBuildInfoFile: path.join(distDir, '.tsbuildinfo'),
      },
      ignoreDiagnostics: true,
    },
  });

  const strapi = createStrapi({ appDir, distDir, autoReload: false, serveAdminPanel: false });

  await strapi.load();
  await strapi.start();

  // Guards the mistake this file's database comment describes: if the path were
  // resolved elsewhere, teardown would delete nothing and leave a stray tree.
  if (!fs.existsSync(databaseFile)) {
    throw new Error(`Expected the test database at ${databaseFile}, but it was not created there`);
  }

  const address = strapi.server.httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Strapi did not bind a TCP port');
  }

  state = { strapi, baseUrl: `http://127.0.0.1:${address.port}`, databaseFile };

  return state;
}

async function cleanupStrapi() {
  if (!state) return;

  const { strapi, databaseFile } = state;
  state = undefined;

  // `Strapi.destroy()` ends with `process.removeAllListeners()`, which also
  // strips the IPC listeners the test worker talks to its parent through — the
  // run then dies with EPIPE even though every test passed. Capture them first
  // and put them back afterwards. `destroy()` closes the HTTP server and the
  // database connection itself, so nothing else needs shutting down here.
  const listeners = process.eventNames().map((event) => [event, process.rawListeners(event)]);

  await strapi.destroy();

  for (const [event, handlers] of listeners) {
    for (const handler of handlers) {
      process.on(event, handler);
    }
  }

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = `${databaseFile}${suffix}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

module.exports = { setupStrapi, cleanupStrapi };
