/**
 * Puts a unique index on `invite_codes.code`, because Strapi does not.
 *
 * The schema declares `"unique": true`, and in Strapi 5 that is enforced by a
 * document-service validator rather than by the database:
 * `transform-content-types-to-models.ts` never turns the attribute flag into a
 * `column.unique`, so `createTable` has nothing to build an index from. Checked
 * against the live table — `\d invite_codes` lists the primary key, the
 * documents index and the two admin-author foreign keys, and no unique index on
 * `code`.
 *
 * A validator is a read followed by a write, which is exactly the shape that
 * loses a race. It also does not constrain the raw writes this codebase already
 * makes through the query engine. The index is the only check that holds for
 * every writer, and it is what makes the generator's collision retry meaningful
 * rather than decorative.
 *
 * Runs from `bootstrap`, not from `database/migrations/`, for the same reason
 * `seed-default-community` does: migrations run before `schema.sync()`, so on a
 * fresh database the table does not exist yet when they execute — and a
 * migration that no-ops is still recorded as done and never runs again.
 *
 * `CREATE UNIQUE INDEX IF NOT EXISTS` is understood by both PostgreSQL and
 * SQLite, the two clients `config/database.ts` supports.
 */

const INVITE_CODE_UID = 'api::invite-code.invite-code';
const INDEX_NAME = 'invite_codes_code_unique';

export const ensureInviteCodeIndex = async ({ strapi }) => {
  const { tableName } = strapi.db.metadata.get(INVITE_CODE_UID);

  const existing = await strapi.db.connection(tableName).select('code').whereNotNull('code');
  const distinct = new Set(existing.map((row: { code: string }) => row.code));

  if (distinct.size !== existing.length) {
    // Creating the index would fail here, and failing the boot over it would
    // be worse than saying so: duplicates can only come from a database that
    // predates this index, and someone has to decide which code to keep.
    strapi.log.error(
      `Duplicate invite codes in "${tableName}" — the unique index was not created. ` +
        'Resolve the duplicates and restart.',
    );
    return;
  }

  await strapi.db.connection.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX_NAME} ON ${tableName} (code)`,
  );
};
