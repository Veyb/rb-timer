// Covers the one-off assignment that keeps the existing deployment from being
// locked out by the community gate (tasks.md 3.7).
//
// `bootstrap` has already run this once against the test database by the time
// these tests start, so each case resets the core-store flag and calls the
// helper directly.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDefaultCommunity } from '../src/helpers/seed-default-community';
import { createRole, createUser, setUserCommunity } from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const COMMUNITY_UID = 'api::community.community';
const USER_UID = 'plugin::users-permissions.user';
const CORE_STORE_KEY = 'community-architecture:default-community-seeded';

let strapi: Core.Strapi;
let privilegedRoleId: number;
let defaultRoleId: number;

const store = () => strapi.store({ type: 'plugin', name: 'community-architecture' });
const resetFlag = () => store().set({ key: CORE_STORE_KEY, value: null });

const communityOf = async (userId: number) => {
  const user = await strapi.db
    .query(USER_UID)
    .findOne({ where: { id: userId }, populate: ['community'] });

  return user?.community ?? null;
};

beforeAll(async () => {
  ({ strapi } = await setupStrapi());

  privilegedRoleId = (await createRole(strapi, 'seed-privileged', [])).id;
  defaultRoleId = (
    await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    })
  ).id;
});

afterAll(async () => {
  await cleanupStrapi();
});

beforeEach(async () => {
  await resetFlag();
});

describe('seeding the default community', () => {
  it('leaves a fresh install untouched but records that it ran', async () => {
    const before = await strapi.db.query(COMMUNITY_UID).count();

    // Every user created so far already has a community or the default role,
    // so this stands in for a deployment with nobody to migrate.
    await seedDefaultCommunity({ strapi });

    expect(await strapi.db.query(COMMUNITY_UID).count()).toBe(before);
    expect(await store().get({ key: CORE_STORE_KEY })).toBe(true);
  });

  it('moves every privileged user without a community into one', async () => {
    const one = await createUser(strapi, privilegedRoleId);
    const two = await createUser(strapi, privilegedRoleId);

    await seedDefaultCommunity({ strapi });

    const first = await communityOf(one.id);
    const second = await communityOf(two.id);

    expect(first).not.toBeNull();
    expect(second?.id).toBe(first?.id);
    expect(first?.name).toBe('Default Community');
    expect(first?.server).toBe('Black');
  });

  it('leaves users on the default role unassigned', async () => {
    const unprivileged = await createUser(strapi, defaultRoleId);
    const privileged = await createUser(strapi, privilegedRoleId);

    await seedDefaultCommunity({ strapi });

    expect(await communityOf(unprivileged.id)).toBeNull();
    expect(await communityOf(privileged.id)).not.toBeNull();
  });

  it('does not move a user who already has a community', async () => {
    const kept = await strapi.documents(COMMUNITY_UID).create({
      data: { name: 'Already Mine', server: 'Gamma' } as never,
    });
    const user = await createUser(strapi, privilegedRoleId);
    await setUserCommunity(strapi, user.id, kept.id);

    await seedDefaultCommunity({ strapi });

    expect((await communityOf(user.id))?.name).toBe('Already Mine');
  });

  it('is a no-op on a second run', async () => {
    await createUser(strapi, privilegedRoleId);
    await seedDefaultCommunity({ strapi });

    const communities = await strapi.db.query(COMMUNITY_UID).count();
    const orphan = await createUser(strapi, privilegedRoleId);

    // The flag is set now, so a run must not touch the new user.
    await seedDefaultCommunity({ strapi });

    expect(await strapi.db.query(COMMUNITY_UID).count()).toBe(communities);
    expect(await communityOf(orphan.id)).toBeNull();
  });

  it('honours the configured name and server', async () => {
    process.env.SEED_COMMUNITY_NAME = 'Configured Guild';
    process.env.SEED_COMMUNITY_SERVER = 'MasterWork';

    try {
      const user = await createUser(strapi, privilegedRoleId);
      await seedDefaultCommunity({ strapi });

      const community = await communityOf(user.id);
      expect(community?.name).toBe('Configured Guild');
      expect(community?.server).toBe('MasterWork');
    } finally {
      delete process.env.SEED_COMMUNITY_NAME;
      delete process.env.SEED_COMMUNITY_SERVER;
    }
  });

  it('falls back to a valid server when configured with a bogus one', async () => {
    process.env.SEED_COMMUNITY_NAME = 'Bogus Server Guild';
    process.env.SEED_COMMUNITY_SERVER = 'Atlantis';

    try {
      const user = await createUser(strapi, privilegedRoleId);
      await seedDefaultCommunity({ strapi });

      expect((await communityOf(user.id))?.server).toBe('Black');
    } finally {
      delete process.env.SEED_COMMUNITY_NAME;
      delete process.env.SEED_COMMUNITY_SERVER;
    }
  });
});
