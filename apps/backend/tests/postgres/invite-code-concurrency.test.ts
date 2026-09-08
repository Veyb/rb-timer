// Two redemptions of the same code at the same moment — specs/community-invites,
// "Redemption is atomic against concurrent attempts".
//
// Runs against PostgreSQL, alone among the suite, because the guarantee is a
// row lock and SQLite has nothing to lock: it serialises writers at the file,
// so `SELECT … FOR UPDATE` compiles to an empty string there and the test would
// pass whether the lock existed or not. That is the whole reason the
// application moved to PostgreSQL before this endpoint was written.
//
// See `vitest.postgres.config.mts` for how to run it and which database it
// expects.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createInviteCode,
  createUser,
  findRole,
  readInviteCode,
  setUserCommunity,
} from '../helpers/fixtures';
import { cleanupStrapi, setupStrapi } from '../helpers/strapi.cjs';

const USER_UID = 'plugin::users-permissions.user';

let strapi: Core.Strapi;
let baseUrl: string;

let defaultRoleId: number;
let officerRoleId: number;

const communityOf = async (userId: number) => {
  const user = await strapi.db
    .query(USER_UID)
    .findOne({ where: { id: userId }, populate: ['community'] });

  return user?.community ?? null;
};

const makeCommunity = async (name: string) => {
  const community = await createCommunity(strapi, { name, server: 'Black' });
  const officer = await createUser(strapi, officerRoleId);
  await setUserCommunity(strapi, officer.id, community.id);

  return community;
};

/**
 * Fires every redemption at once and waits for all of them.
 *
 * Each contender is a separate account: the rate limiter is keyed on the
 * caller, and more importantly one account could only ever be admitted once.
 */
const redeemConcurrently = async (code: string, contenders: number) => {
  const users = [];
  for (let index = 0; index < contenders; index += 1) {
    users.push(await createUser(strapi, defaultRoleId));
  }

  const responses = await Promise.all(
    users.map((user) =>
      apiRequest(baseUrl, 'POST', '/api/invite-codes/redeem', { jwt: user.jwt, body: { code } }),
    ),
  );

  return { users, responses };
};

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi({ client: 'postgres' }));

  defaultRoleId = (await findRole(strapi, 'authenticated')).id;
  officerRoleId = (await findRole(strapi, 'officer')).id;
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('POST /invite-codes/redeem under contention', () => {
  it('is running against PostgreSQL, or it proves nothing', () => {
    // Without this the file would silently degrade into a slower copy of the
    // SQLite suite if the harness ever defaulted differently.
    // Strapi's `postgres` client name reaches knex as its own dialect name.
    expect(strapi.db.connection.client.config.client).toBe('pg');
  });

  it('admits exactly one of two simultaneous redemptions of a single-use code', async () => {
    const community = await makeCommunity('Race Two');
    const code = await createInviteCode(strapi, community.id, { maxUses: 1 });

    const { users, responses } = await redeemConcurrently(code.code, 2);

    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 403)).toHaveLength(1);

    const admitted = [];
    for (const user of users) {
      if (await communityOf(user.id)) admitted.push(user.id);
    }

    expect(admitted).toHaveLength(1);
    expect((await readInviteCode(strapi, code.id)).usedCount).toBe(1);
  });

  it('never admits more than the limit, however many arrive together', async () => {
    const community = await makeCommunity('Race Many');
    const code = await createInviteCode(strapi, community.id, { maxUses: 3 });

    const { users, responses } = await redeemConcurrently(code.code, 8);

    expect(responses.filter((response) => response.status === 200)).toHaveLength(3);

    const admitted = [];
    for (const user of users) {
      if (await communityOf(user.id)) admitted.push(user.id);
    }

    expect(admitted).toHaveLength(3);
    expect((await readInviteCode(strapi, code.id)).usedCount).toBe(3);

    const redemptions = await strapi.db
      .query('api::invite-redemption.invite-redemption')
      .findMany({ where: { inviteCode: code.id } });

    // The counter and the record of who was let in have to agree — a counter
    // that stops at the limit while four accounts joined would satisfy the
    // assertions above on its own.
    expect(redemptions).toHaveLength(3);
  });
});
