// Covers specs/community-isolation from the community-architecture change.
//
// Two communities exist throughout, so every assertion is about a real
// boundary rather than an empty database. Requests go over HTTP against the
// booted instance — the same way a hand-written request would, which is the
// only threat model that matters here: the frontend bundles its API URL and
// keeps the token in a readable cookie.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createRole,
  createUser,
  findRole,
  readUserRole,
  setUserCommunity,
  type TestUser,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const MEMBER_ACTIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.updateMe',
  'api::community-member.community-member.find',
  'api::community-member.community-member.findOne',
];
const OFFICER_ACTIONS = [...MEMBER_ACTIONS, 'api::community-member.community-member.updateRole'];

// Also granted the general-purpose user actions, on purpose: the handlers must
// refuse even a caller who somehow holds the permission, so the guarantee does
// not rest on the permission seeder alone.
const OVER_GRANTED_ACTIONS = [
  ...OFFICER_ACTIONS,
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  'plugin::users-permissions.user.count',
  'plugin::users-permissions.user.create',
  'plugin::users-permissions.user.update',
  'plugin::users-permissions.user.destroy',
];

let strapi: Core.Strapi;
let baseUrl: string;

let viewerRoleId: number;
let officerRoleId: number;
let overGrantedRoleId: number;

let alphaId: number;
let alphaOfficer: TestUser;
let alphaViewer: TestUser;
let betaMember: TestUser;
let homeless: TestUser;
let overGranted: TestUser;

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi());

  // The real roles the app declares, not stand-ins: `global::is-officer`
  // matches on the role type, and the permissions under test are the ones the
  // seeder actually grants.
  viewerRoleId = (await findRole(strapi, 'viewer')).id;
  officerRoleId = (await findRole(strapi, 'officer')).id;
  overGrantedRoleId = (await createRole(strapi, 'iso-over-granted', OVER_GRANTED_ACTIONS)).id;

  const alpha = await createCommunity(strapi, { name: 'Alpha', server: 'Gamma' });
  const beta = await createCommunity(strapi, { name: 'Beta', server: 'White' });

  alphaId = alpha.id as number;

  alphaOfficer = await createUser(strapi, officerRoleId);
  alphaViewer = await createUser(strapi, viewerRoleId);
  betaMember = await createUser(strapi, viewerRoleId);
  homeless = await createUser(strapi, viewerRoleId);
  overGranted = await createUser(strapi, overGrantedRoleId);

  await setUserCommunity(strapi, alphaOfficer.id, alpha.id);
  await setUserCommunity(strapi, alphaViewer.id, alpha.id);
  await setUserCommunity(strapi, overGranted.id, alpha.id);
  await setUserCommunity(strapi, betaMember.id, beta.id);
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('the user collection is not reachable through the Content API', () => {
  it.each([
    ['GET', '/api/users'],
    ['GET', '/api/users/count'],
    ['GET', '/api/users/1'],
    ['POST', '/api/users'],
    ['PUT', '/api/users/1'],
    ['DELETE', '/api/users/1'],
  ])('refuses %s %s even for a caller granted the action', async (method, route) => {
    const response = await apiRequest(baseUrl, method, route, {
      jwt: overGranted.jwt,
      ...(method === 'POST' || method === 'PUT'
        ? { body: { username: 'x', email: 'x@example.invalid', password: 'x' } }
        : {}),
    });

    expect(response.status).toBe(403);
  });

  it('deletes nobody through the general-purpose endpoint', async () => {
    const before = await strapi.db.query('plugin::users-permissions.user').count();

    await apiRequest(baseUrl, 'DELETE', `/api/users/${betaMember.id}`, { jwt: overGranted.jwt });

    expect(await strapi.db.query('plugin::users-permissions.user').count()).toBe(before);
  });
});

describe('the role list an officer may read', () => {
  it('names the assignable roles and nothing else', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/member-roles', {
      jwt: alphaOfficer.jwt,
    });

    expect(response.status).toBe(200);
    expect(response.body.map((role: { type: string }) => role.type)).toEqual([
      'viewer',
      'editor',
      'officer',
    ]);

    for (const role of response.body) {
      expect(Object.keys(role).sort()).toEqual(['name', 'type']);
    }
  });

  it('discloses no installation-wide count and no permission map', async () => {
    // What the plugin's own role endpoints answer with, and the reason this
    // one exists: `nb_users` counts accounts per role across every community,
    // and a single role comes back carrying every action it may call.
    const response = await apiRequest(baseUrl, 'GET', '/api/community/member-roles', {
      jwt: alphaOfficer.jwt,
    });

    const body = JSON.stringify(response.body);
    expect(body).not.toContain('nb_users');
    expect(body).not.toContain('permissions');
  });

  it('leaves the plugin role endpoints refused for an officer', async () => {
    for (const route of ['/api/users-permissions/roles', '/api/users-permissions/roles/1']) {
      const response = await apiRequest(baseUrl, 'GET', route, { jwt: alphaOfficer.jwt });

      expect(response.status).toBe(403);
    }
  });

  it('is refused for a member who is not an officer', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/member-roles', {
      jwt: alphaViewer.jwt,
    });

    expect(response.status).toBe(403);
  });

  it('is refused by the policy, not only by the permission', async () => {
    // `alphaViewer` above does not hold the action at all, so that test cannot
    // tell whether the route policy does anything. This one grants the action
    // to a role that is not `officer` — the only shape that reaches the policy.
    const role = await createRole(strapi, `roles_probe_${process.pid}`, [
      'api::community-member.community-member.roles',
    ]);
    const caller = await createUser(strapi, role.id);
    await setUserCommunity(strapi, caller.id, alphaId);

    const response = await apiRequest(baseUrl, 'GET', '/api/community/member-roles', {
      jwt: caller.jwt,
    });

    expect(response.status).toBe(403);
  });
});

describe('member listing is scoped to the caller`s community', () => {
  it('returns only members of the caller`s own community', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/members', {
      jwt: alphaViewer.jwt,
    });

    expect(response.status).toBe(200);

    const ids = response.body.map((member: { documentId: string }) => member.documentId);
    expect(ids).toContain(alphaViewer.documentId);
    expect(ids).toContain(alphaOfficer.documentId);
    expect(ids).not.toContain(betaMember.documentId);
    expect(ids).not.toContain(homeless.documentId);
  });

  it('refuses a caller who belongs to no community', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/members', {
      jwt: homeless.jwt,
    });

    expect(response.status).toBe(403);
  });

  it.each([
    ['a foreign community filter', 'filters[community][name][$eq]=Beta'],
    ['a filter naming the foreign member', 'filters[id][$eq]='],
    ['an attempt to disable filtering', 'filters[community][id][$null]=true'],
    ['a populate directive', 'populate=*'],
    ['a fields directive', 'fields=email'],
  ])('cannot be widened by %s', async (_label, query) => {
    const suffix = query.endsWith('=') ? `${query}${betaMember.documentId}` : query;
    const response = await apiRequest(baseUrl, 'GET', `/api/community/members?${suffix}`, {
      jwt: alphaViewer.jwt,
    });

    expect(response.status).toBe(200);

    const ids = response.body.map((member: { documentId: string }) => member.documentId);
    expect(ids).not.toContain(betaMember.documentId);
    expect(ids).not.toContain(homeless.documentId);
    expect(ids).toContain(alphaViewer.documentId);
  });
});

describe('member detail is scoped to the caller`s community', () => {
  it('returns a member of the same community', async () => {
    const response = await apiRequest(
      baseUrl,
      'GET',
      `/api/community/members/${alphaOfficer.documentId}`,
      {
        jwt: alphaViewer.jwt,
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.documentId).toBe(alphaOfficer.documentId);
  });

  it.each([
    ['another community', () => betaMember.documentId],
    ['no community', () => homeless.documentId],
  ])('answers as not-found for a user of %s', async (_label, id) => {
    const response = await apiRequest(baseUrl, 'GET', `/api/community/members/${id()}`, {
      jwt: alphaViewer.jwt,
    });

    expect(response.status).toBe(404);
    // Nothing in the response may disclose that the account exists. Its id is
    // in the request the caller already made, so what matters is that no
    // attribute of the account comes back.
    expect(JSON.stringify(response.body)).not.toContain('username');
    expect(JSON.stringify(response.body)).not.toContain('nickname');
  });
});

describe('member data exposes no account secrets', () => {
  const FORBIDDEN = ['password', 'resetPasswordToken', 'confirmationToken', 'email'];

  it('omits them from the listing', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/members', {
      jwt: alphaViewer.jwt,
    });

    const serialized = JSON.stringify(response.body);
    for (const field of FORBIDDEN) {
      expect(serialized).not.toContain(field);
    }
    expect(serialized).not.toContain(alphaOfficer.email);
  });

  it('omits them from a single member', async () => {
    const response = await apiRequest(
      baseUrl,
      'GET',
      `/api/community/members/${alphaOfficer.documentId}`,
      {
        jwt: alphaViewer.jwt,
      },
    );

    for (const field of FORBIDDEN) {
      expect(Object.keys(response.body)).not.toContain(field);
    }
  });
});

describe('role administration is scoped to the caller`s community', () => {
  it('lets an officer change a role in their own community', async () => {
    const target = await createUser(strapi, viewerRoleId);
    await setUserCommunity(strapi, target.id, alphaId);

    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${target.documentId}/role`,
      {
        jwt: alphaOfficer.jwt,
        body: { role: 'editor' },
      },
    );

    expect(response.status).toBe(200);
    expect((await readUserRole(strapi, target.id)).type).toBe('editor');
  });

  it('refuses an officer targeting another community', async () => {
    const before = (await readUserRole(strapi, betaMember.id)).id;

    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${betaMember.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { role: 'officer' } },
    );

    expect(response.status).toBe(404);
    expect((await readUserRole(strapi, betaMember.id)).id).toBe(before);
  });

  it('refuses an officer targeting a community-less user', async () => {
    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${homeless.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { role: 'officer' } },
    );

    expect(response.status).toBe(404);
    expect((await readUserRole(strapi, homeless.id)).id).toBe(viewerRoleId);
  });

  it('does not offer the registration default as a rank', async () => {
    // Assigning it would leave a member inside the community with no access —
    // what removal already does, but silently and without a way back for the
    // member. Removal is the named act; this is not a rank.
    const response = await apiRequest(baseUrl, 'GET', '/api/community/member-roles', {
      jwt: alphaOfficer.jwt,
    });

    expect(response.body.map((role: { type: string }) => role.type)).not.toContain('authenticated');
  });

  it('refuses an attempt to set the registration default', async () => {
    const target = await createUser(strapi, viewerRoleId);
    await setUserCommunity(strapi, target.id, alphaId);

    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${target.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { role: 'authenticated' } },
    );

    expect(response.status).toBe(400);
    expect((await readUserRole(strapi, target.id)).type).toBe('viewer');
  });

  it('refuses a non-officer', async () => {
    const before = (await readUserRole(strapi, alphaOfficer.id)).id;

    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${alphaOfficer.documentId}/role`,
      { jwt: alphaViewer.jwt, body: { role: 'viewer' } },
    );

    expect(response.status).toBe(403);
    expect((await readUserRole(strapi, alphaOfficer.id)).id).toBe(before);
  });

  it('refuses an officer changing their own role', async () => {
    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${alphaOfficer.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { role: 'viewer' } },
    );

    expect(response.status).toBe(403);
    expect((await readUserRole(strapi, alphaOfficer.id)).id).toBe(officerRoleId);
  });

  it('refuses a role outside the assignable set', async () => {
    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${alphaViewer.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { role: 'public' } },
    );

    expect(response.status).toBe(400);
  });

  it('refuses a request carrying anything but a role', async () => {
    const response = await apiRequest(
      baseUrl,
      'PUT',
      `/api/community/members/${alphaViewer.documentId}/role`,
      { jwt: alphaOfficer.jwt, body: { nickname: 'Renamed' } },
    );

    expect(response.status).toBe(400);
  });
});
