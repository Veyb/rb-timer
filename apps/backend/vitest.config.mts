import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Deliberately not `tests/**`: `tests/postgres/` needs a running PostgreSQL
    // server and has its own config, `vitest.postgres.config.mts`.
    include: ['tests/*.test.ts'],
    environment: 'node',
    // Every test file boots its own Strapi instance, and booting runs
    // `compileStrapi()` which writes to the shared `dist/`. Running files in
    // parallel would have them race over that directory.
    fileParallelism: false,
    // Booting Strapi means a TypeScript compile plus a full app load.
    hookTimeout: 180_000,
    testTimeout: 60_000,
  },
});
