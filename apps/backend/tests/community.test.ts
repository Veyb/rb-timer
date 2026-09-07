// Covers specs/community from the community-architecture change.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createFile,
  createRole,
  createUser,
  setUserCommunity,
  type TestUser,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const COMMUNITY_UID = 'api::community.community';
const USER_UID = 'plugin::users-permissions.user';
const PROFILE_ACTIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.updateMe',
];

let strapi: Core.Strapi;
let baseUrl: string;
let memberRoleId: number;
let member: TestUser;

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi());

  memberRoleId = (await createRole(strapi, 'test-member', PROFILE_ACTIONS)).id;
  member = await createUser(strapi, memberRoleId);
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('community record', () => {
  it('is stored when the required fields are given', async () => {
    const community = await createCommunity(strapi, { name: 'Test Guild', server: 'Carmine' });

    expect(community.name).toBe('Test Guild');
    expect(community.server).toBe('Carmine');
  });

  it('refuses a community without a name', async () => {
    await expect(
      strapi.documents(COMMUNITY_UID).create({ data: { server: 'Black' } as never }),
    ).rejects.toThrow();
  });

  it('refuses a server outside the permitted set', async () => {
    await expect(
      createCommunity(strapi, { name: 'Wrong Server', server: 'Atlantis' }),
    ).rejects.toThrow();
  });

  it.each(['Gamma', 'Black', 'White', 'Carmine', 'MasterWork'])(
    'accepts server %s',
    async (server) => {
      const community = await createCommunity(strapi, { server });

      expect(community.server).toBe(server);
    },
  );
});

describe('community logo must be square', () => {
  it('accepts a square image', async () => {
    const logo = await createFile(strapi, { width: 128, height: 128 });
    const community = await createCommunity(strapi, { logo: logo.id });

    expect(community.documentId).toBeTruthy();
  });

  it('refuses a non-square image on create', async () => {
    const logo = await createFile(strapi, { width: 128, height: 64 });

    await expect(createCommunity(strapi, { logo: logo.id })).rejects.toThrow(/square/i);
  });

  it('refuses a non-square image on update, keeping the previous logo', async () => {
    const square = await createFile(strapi, { width: 64, height: 64 });
    const oblong = await createFile(strapi, { width: 64, height: 32 });
    const community = await createCommunity(strapi, { logo: square.id });

    await expect(
      strapi
        .documents(COMMUNITY_UID)
        .update({ documentId: community.documentId, data: { logo: oblong.id } as never }),
    ).rejects.toThrow(/square/i);

    const reread = await strapi.documents(COMMUNITY_UID).findOne({
      documentId: community.documentId,
      populate: ['logo'] as never,
    });

    expect((reread as { logo?: { id: number } }).logo?.id).toBe(square.id);
  });

  it('refuses a non-square image supplied in the relation-editor shape', async () => {
    const logo = await createFile(strapi, { width: 200, height: 100 });

    await expect(createCommunity(strapi, { logo: { set: [{ id: logo.id }] } })).rejects.toThrow(
      /square/i,
    );
  });

  it('accepts an image without intrinsic dimensions', async () => {
    const logo = await createFile(strapi, { width: null, height: null });
    const community = await createCommunity(strapi, { logo: logo.id });

    expect(community.documentId).toBeTruthy();
  });

  it('accepts a community with no logo at all', async () => {
    const community = await createCommunity(strapi);

    expect(community.documentId).toBeTruthy();
  });
});

describe('communities are managed only by operators', () => {
  it.each([
    ['GET', '/api/communities'],
    ['GET', '/api/communities/1'],
    ['POST', '/api/communities'],
    ['PUT', '/api/communities/1'],
    ['DELETE', '/api/communities/1'],
  ])('refuses %s %s for an authenticated user', async (method, route) => {
    const response = await apiRequest(baseUrl, method, route, {
      jwt: member.jwt,
      ...(method === 'GET' || method === 'DELETE' ? {} : { body: { name: 'X', server: 'Black' } }),
    });

    // No Content API router is registered for this collection at all, so the
    // endpoint does not exist rather than being forbidden — there is no
    // permission for an operator to grant by accident. Koa answers 404 where
    // nothing matches the path and 405 where the path is known for other
    // methods; neither is a 403, and neither reaches a handler.
    expect([404, 405]).toContain(response.status);
  });

  it('creates no community through the Content API', async () => {
    const before = await strapi.db.query(COMMUNITY_UID).count();

    await apiRequest(baseUrl, 'POST', '/api/communities', {
      jwt: member.jwt,
      body: { name: 'Smuggled', server: 'Black' },
    });

    expect(await strapi.db.query(COMMUNITY_UID).count()).toBe(before);
  });
});

describe('a user belongs to at most one community', () => {
  it('has no community when freshly registered', async () => {
    const fresh = await createUser(strapi, memberRoleId);
    const stored = await strapi.db
      .query(USER_UID)
      .findOne({ where: { id: fresh.id }, populate: ['community'] });

    expect(stored.community).toBeNull();
  });

  it('holds exactly the community last assigned', async () => {
    const first = await createCommunity(strapi, { name: 'First' });
    const second = await createCommunity(strapi, { name: 'Second' });
    const user = await createUser(strapi, memberRoleId);

    await setUserCommunity(strapi, user.id, first.id);
    await setUserCommunity(strapi, user.id, second.id);

    const stored = await strapi.db
      .query(USER_UID)
      .findOne({ where: { id: user.id }, populate: ['community'] });

    expect(stored.community.id).toBe(second.id);
  });
});

describe('a member can read their own community', () => {
  it('returns the community with its logo', async () => {
    const logo = await createFile(strapi, { width: 96, height: 96 });
    const community = await createCommunity(strapi, {
      name: 'Readable',
      server: 'White',
      logo: logo.id,
    });
    const user = await createUser(strapi, memberRoleId);

    await setUserCommunity(strapi, user.id, community.id);

    const response = await apiRequest(baseUrl, 'GET', '/api/users/me', { jwt: user.jwt });

    expect(response.status).toBe(200);
    expect(response.body.community.name).toBe('Readable');
    expect(response.body.community.server).toBe('White');
    expect(response.body.community.logo.id).toBe(logo.id);
  });

  it('reports the absence of a community rather than failing', async () => {
    const user = await createUser(strapi, memberRoleId);

    const response = await apiRequest(baseUrl, 'GET', '/api/users/me', { jwt: user.jwt });

    expect(response.status).toBe(200);
    expect(response.body.community).toBeNull();
  });

  it('never exposes another member of the same community', async () => {
    const community = await createCommunity(strapi, { name: 'Shared' });
    const [one, two] = [
      await createUser(strapi, memberRoleId),
      await createUser(strapi, memberRoleId),
    ];

    await setUserCommunity(strapi, one.id, community.id);
    await setUserCommunity(strapi, two.id, community.id);

    const response = await apiRequest(baseUrl, 'GET', '/api/users/me', { jwt: one.jwt });

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain(two.email);
  });
});
