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

/**
 * Reads `apps/backend/.env` the way the application does at boot. A plain
 * script does not load it, and `dotenv` is only a transitive dependency —
 * `scripts/e2e-fixture.js` reads it the same way and for the same reason.
 */
function readEnvFile(appDir) {
  const file = path.join(appDir, '.env');
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
}

/**
 * Points the instance at a throwaway SQLite file. The default: fast, isolated
 * per run, and enough for everything except a test about two writers
 * contending, which SQLite cannot have.
 */
function sqliteDatabase(appDir) {
  // `config/database.ts` joins DATABASE_FILENAME onto the app root, so this has
  // to stay relative to apps/backend: an absolute path would be appended to
  // that root and quietly create a directory tree inside the repository.
  // `.tmp/` is already gitignored.
  const relativeDatabaseFile = path.join('.tmp', `test-${process.pid}-${Date.now()}.db`);
  const databaseFile = path.join(appDir, relativeDatabaseFile);
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  process.env.DATABASE_CLIENT = 'sqlite';
  process.env.DATABASE_FILENAME = relativeDatabaseFile;

  return {
    databaseFile,
    // The boot guard for the mistake the comment above describes: if the path
    // were resolved elsewhere, teardown would delete nothing and leave a stray
    // tree inside the repository.
    verify() {
      if (!fs.existsSync(databaseFile)) {
        throw new Error(
          `Expected the test database at ${databaseFile}, but it was not created there`,
        );
      }
    },
    async teardown() {
      for (const suffix of ['', '-journal', '-wal', '-shm']) {
        const file = `${databaseFile}${suffix}`;
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    },
  };
}

/**
 * Points the instance at a real PostgreSQL database, for the one thing SQLite
 * cannot show: two writers contending for the same row. SQLite serialises them
 * outright, so a test for `SELECT … FOR UPDATE` would pass there whether the
 * lock existed or not.
 *
 * Connects with the credentials from `.env` — the application's own role, not
 * a privileged one — and to a database the developer creates once:
 *
 *     createdb -O rb_timer rb_timer_test
 *
 * Every run starts by dropping and recreating the `public` schema, so the run
 * is as isolated as the SQLite file is. Two guards stand between that statement
 * and someone's data: the name must differ from the application's own database,
 * and it must end in `_test`.
 */
function postgresDatabase(appDir) {
  const env = { ...readEnvFile(appDir), ...process.env };
  const appDatabase = env.DATABASE_NAME;
  const database = env.TEST_DATABASE_NAME || 'rb_timer_test';

  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to use "${database}" as a test database: the name must end in _test`);
  }

  if (database === appDatabase) {
    throw new Error(
      `Refusing to use "${database}" as a test database: it is the application's own database`,
    );
  }

  const connection = {
    host: env.DATABASE_HOST || 'localhost',
    port: Number(env.DATABASE_PORT || 5432),
    user: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
    database,
  };

  process.env.DATABASE_CLIENT = 'postgres';
  process.env.DATABASE_HOST = String(connection.host);
  process.env.DATABASE_PORT = String(connection.port);
  process.env.DATABASE_NAME = database;
  process.env.DATABASE_USERNAME = connection.user;
  process.env.DATABASE_PASSWORD = connection.password;

  return {
    async prepare() {
      const { Client } = require('pg');
      const client = new Client(connection);

      try {
        await client.connect();
      } catch (error) {
        throw new Error(
          `Could not connect to the test database "${database}" as ${connection.user}: ${error.message}\n` +
            `Create it once with: createdb -O ${connection.user} ${database}`,
        );
      }

      try {
        await client.query('DROP SCHEMA public CASCADE');
        await client.query('CREATE SCHEMA public');
      } finally {
        await client.end();
      }
    },
    // Nothing to remove: the next run wipes the schema before it boots, and
    // leaving it in place makes a failed run inspectable.
    async teardown() {},
  };
}

async function setupStrapi(options = {}) {
  if (state) return state;

  const appDir = resolveAppDir();
  const database =
    options.client === 'postgres' ? postgresDatabase(appDir) : sqliteDatabase(appDir);

  await database.prepare?.();

  // An ephemeral port, so a run never collides with a running dev server.
  process.env.NODE_ENV = 'test';
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

  database.verify?.();

  const address = strapi.server.httpServer.address();

  if (!address || typeof address === 'string') {
    throw new Error('Strapi did not bind a TCP port');
  }

  state = { strapi, baseUrl: `http://127.0.0.1:${address.port}`, database };

  return state;
}

async function cleanupStrapi() {
  if (!state) return;

  const { strapi, database } = state;
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

  await database.teardown();
}

module.exports = { setupStrapi, cleanupStrapi };
