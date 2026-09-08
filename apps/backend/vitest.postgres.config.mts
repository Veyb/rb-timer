import { defineConfig } from 'vitest/config';

// The tests that need a real PostgreSQL server, kept out of the default run so
// that run stays a single fast SQLite boot. There is one of them, and it is
// here because SQLite cannot express what it asserts: it serialises writers, so
// a test about two transactions contending for a row would pass there whether
// the row lock existed or not.
//
// `pnpm test` runs both configs in turn; `pnpm test:postgres` runs only this
// one. It expects the database `tests/helpers/strapi.cjs` documents:
//
//     createdb -O rb_timer rb_timer_test
export default defineConfig({
  test: {
    include: ['tests/postgres/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    // Booting against PostgreSQL means a TypeScript compile, a schema sync into
    // an empty database and a full app load.
    hookTimeout: 180_000,
    testTimeout: 60_000,
  },
});
