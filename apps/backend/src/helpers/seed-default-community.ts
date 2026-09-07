/**
 * One-off data migration: puts every user who already had access into a
 * community, so that the community gate does not lock out the existing
 * deployment the moment it starts being enforced.
 *
 * Deliberately not a knex migration under `database/migrations/`. Strapi runs
 * those from inside `schema.sync()`, *before* the tables are built:
 *
 *   if (await db.migrations.shouldRun()) {
 *     await db.migrations.up();     // <- here
 *     return this.syncSchema();     // <- tables created only now
 *   }
 *
 * (`@strapi/database/dist/schema/index.js`.) On the first boot after this
 * change the `communities` table does not exist yet, so a migration inserting
 * into it would fail. `bootstrap` runs after the sync, with the Document
 * Service available, and a flag in the core store keeps it to a single run.
 */

const CORE_STORE_KEY = 'community-architecture:default-community-seeded';
const COMMUNITY_UID = 'api::community.community';
const USER_UID = 'plugin::users-permissions.user';

const SERVERS = ['Gamma', 'Black', 'White', 'Carmine', 'MasterWork'] as const;

export const seedDefaultCommunity = async ({ strapi }) => {
  const store = strapi.store({ type: 'plugin', name: 'community-architecture' });

  if (await store.get({ key: CORE_STORE_KEY })) return;

  const advanced = (await strapi
    .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
    .get()) as { default_role?: string };
  const defaultRole = advanced?.default_role ?? 'authenticated';

  // Everyone who can already reach the app: a role above the default one, and
  // no community yet. Users still on the default role have no access today, so
  // they have nothing to lose by staying unassigned.
  const orphans = await strapi.db.query(USER_UID).findMany({
    where: { community: null, role: { type: { $ne: defaultRole } } },
    populate: ['role'],
  });

  if (orphans.length === 0) {
    // A fresh install (or a test database): nothing to migrate, and an empty
    // placeholder community would only be noise.
    await store.set({ key: CORE_STORE_KEY, value: true });
    return;
  }

  const name = process.env.SEED_COMMUNITY_NAME || 'Default Community';
  const requestedServer = process.env.SEED_COMMUNITY_SERVER;
  const server = SERVERS.includes(requestedServer as (typeof SERVERS)[number])
    ? requestedServer
    : SERVERS[1]; // Black — the server the raid boss data was captured from

  if (requestedServer && server !== requestedServer) {
    strapi.log.warn(
      `SEED_COMMUNITY_SERVER="${requestedServer}" is not one of ${SERVERS.join(', ')}; using "${server}"`,
    );
  }

  const existing = await strapi.db.query(COMMUNITY_UID).findOne({ where: { name } });
  const community =
    existing ?? (await strapi.documents(COMMUNITY_UID).create({ data: { name, server } }));

  // One at a time on purpose: `updateMany` writes columns only, and rejects a
  // payload holding nothing but a relation ("Update requires data") because
  // `community` lives in a link table rather than on the row. The set is
  // bounded and this runs once.
  for (const user of orphans) {
    await strapi.db.query(USER_UID).update({
      where: { id: user.id },
      data: { community: community.id },
    });
  }

  await store.set({ key: CORE_STORE_KEY, value: true });

  strapi.log.info(
    `Assigned ${orphans.length} pre-existing user(s) to community "${name}" (${server})`,
  );
};
