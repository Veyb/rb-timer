// Covers specs/user-account-updates from the community-architecture change.
//
// Regression guard for a real escalation: `user.updateMe` used to forward
// `{ ...ctx.request.body }` to the Document Service, which writes any attribute
// of the user model. A `viewer` — the lowest role that holds `updateMe`, since
// the collections screen needs it — could send `{ role: <officer id> }` and be
// promoted. The `community` cases below pass today because the schema rejects
// unknown keys; they keep passing once `community` becomes a real attribute,
// which is the point.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createRole,
  createUser,
  errorMessage,
  readUser,
  readUserRole,
  type TestUser,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const PROFILE_ACTIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.updateMe',
];
const OPERATOR_ACTIONS = [...PROFILE_ACTIONS, 'plugin::users-permissions.user.update'];

let strapi: Core.Strapi;
let baseUrl: string;
let viewerRoleId: number;
let officerRoleId: number;
let viewer: TestUser;
let officer: TestUser;
let target: TestUser;

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi());

  const viewerRole = await createRole(strapi, 'test-viewer', PROFILE_ACTIONS);
  const officerRole = await createRole(strapi, 'test-officer', OPERATOR_ACTIONS);

  viewerRoleId = viewerRole.id;
  officerRoleId = officerRole.id;

  viewer = await createUser(strapi, viewerRoleId);
  officer = await createUser(strapi, officerRoleId);
  target = await createUser(strapi, viewerRoleId);
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('self-service updates accept only profile attributes', () => {
  it('accepts a profile attribute', async () => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { nickname: 'Renamed' },
    });

    expect(response.status).toBe(200);
    expect(response.body.nickname).toBe('Renamed');
  });

  it('keeps the collections tracking path working', async () => {
    const collections = { 1: { 2: true } };
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { collections },
    });

    expect(response.status).toBe(200);
    expect(response.body.collections).toEqual(collections);
  });

  it('refuses a self-assigned role and leaves the role untouched', async () => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { role: officerRoleId },
    });

    expect(response.status).toBe(400);
    expect(errorMessage(response)).toContain('role');
    expect((await readUserRole(strapi, viewer.id)).id).toBe(viewerRoleId);
  });

  it('refuses a role smuggled in alongside a legitimate attribute', async () => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { nickname: 'Sneaky', role: officerRoleId },
    });

    expect(response.status).toBe(400);
    expect((await readUserRole(strapi, viewer.id)).id).toBe(viewerRoleId);
    // Rejected as a whole: the allowed half must not be applied either.
    expect((await readUser(strapi, viewer.id)).nickname).not.toBe('Sneaky');
  });

  it('refuses a self-assigned community', async () => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { community: 1 },
    });

    expect(response.status).toBe(400);
    expect(errorMessage(response)).toContain('community');
  });
});

describe('privileged attributes are never client-assignable', () => {
  it.each([
    ['blocked', { blocked: true }],
    ['confirmed', { confirmed: false }],
    ['provider', { provider: 'spoofed' }],
    ['resetPasswordToken', { resetPasswordToken: 'forged' }],
    ['confirmationToken', { confirmationToken: 'forged' }],
  ])('refuses %s on the own-account route', async (_attribute, body) => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body,
    });

    expect(response.status).toBe(400);
  });

  it.each([
    ['community', { community: 1 }],
    ['blocked', { blocked: true }],
    ['confirmed', { confirmed: false }],
    ['resetPasswordToken', { resetPasswordToken: 'forged' }],
  ])('refuses %s on the operator route', async (_attribute, body) => {
    const response = await apiRequest(baseUrl, 'PUT', `/api/users/${target.id}`, {
      jwt: officer.jwt,
      body,
    });

    expect(response.status).toBe(400);
    expect((await readUserRole(strapi, target.id)).id).toBe(viewerRoleId);
  });

  it('names the offending attribute rather than ignoring it', async () => {
    const response = await apiRequest(baseUrl, 'PUT', '/api/users/me', {
      jwt: viewer.jwt,
      body: { somethingInvented: true },
    });

    expect(response.status).toBe(400);
    expect(errorMessage(response)).toContain('somethingInvented');
  });

  it('refuses a relation-connect object where a role id is expected', async () => {
    const response = await apiRequest(baseUrl, 'PUT', `/api/users/${target.id}`, {
      jwt: officer.jwt,
      body: { role: { connect: [officerRoleId] } },
    });

    expect(response.status).toBe(400);
    expect((await readUserRole(strapi, target.id)).id).toBe(viewerRoleId);
  });

  it('still lets the operator route set a role by id', async () => {
    const response = await apiRequest(baseUrl, 'PUT', `/api/users/${target.id}`, {
      jwt: officer.jwt,
      body: { role: officerRoleId },
    });

    expect(response.status).toBe(200);
    expect((await readUserRole(strapi, target.id)).id).toBe(officerRoleId);

    await apiRequest(baseUrl, 'PUT', `/api/users/${target.id}`, {
      jwt: officer.jwt,
      body: { role: viewerRoleId },
    });
  });
});

describe('registration cannot pre-assign membership or role', () => {
  it.each([
    ['role', { role: 1 }],
    ['community', { community: 1 }],
    ['blocked', { blocked: false }],
  ])('refuses %s in the registration body', async (attribute, extra) => {
    const tag = `register_${attribute}_${Date.now()}`;
    const response = await apiRequest(baseUrl, 'POST', '/api/auth/local/register', {
      body: {
        username: tag,
        email: `${tag}@example.invalid`,
        password: 'ProbePass!2026',
        nickname: 'Probe',
        realname: 'Probe',
        ...extra,
      },
    });

    expect(response.status).toBe(400);
    expect(errorMessage(response)).toContain(attribute);
  });

  it('gives a plain registration the default role and no community', async () => {
    const tag = `register_plain_${Date.now()}`;
    const response = await apiRequest(baseUrl, 'POST', '/api/auth/local/register', {
      body: {
        username: tag,
        email: `${tag}@example.invalid`,
        password: 'ProbePass!2026',
        nickname: 'Probe',
        realname: 'Probe',
      },
    });

    expect(response.status).toBe(200);

    const role = await readUserRole(strapi, response.body.user.id);
    expect(role.type).toBe('authenticated');
  });
});
