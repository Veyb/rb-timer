// Role and user fixtures for integration tests.
//
// A freshly booted test database holds only the `public` and `authenticated`
// roles that the users-permissions plugin bootstraps, with no permissions on
// the user endpoints. Every role a test needs — and every action it is allowed
// to call — is therefore created explicitly here, which also keeps the tests
// independent of however the development database happens to be configured.

import type { Core } from '@strapi/strapi';

const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

export interface TestUser {
  id: number;
  jwt: string;
  email: string;
  username: string;
  password: string;
}

let counter = 0;

/** Creates a role holding exactly `actions`, e.g. `user.me`, `user.updateMe`. */
export async function createRole(strapi: Core.Strapi, type: string, actions: string[]) {
  const role = await strapi.db.query(ROLE_UID).create({
    data: { name: `Test ${type}`, description: `test fixture role: ${type}`, type },
  });

  for (const action of actions) {
    await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
  }

  return role;
}

/** Creates a confirmed user holding `roleId`, and issues a usable JWT for it. */
export async function createUser(strapi: Core.Strapi, roleId: number): Promise<TestUser> {
  counter += 1;
  const tag = `${process.pid}_${counter}`;
  const credentials = {
    username: `probe_${tag}`,
    email: `probe_${tag}@example.invalid`,
    password: 'ProbePass!2026',
  };

  const user = await strapi
    .plugin('users-permissions')
    .service('user')
    .add({
      ...credentials,
      nickname: `Probe ${tag}`,
      realname: `Probe ${tag}`,
      provider: 'local',
      confirmed: true,
      role: roleId,
    });

  const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });

  return { id: user.id, jwt, ...credentials };
}

/** The role currently linked to `userId`, read back from the database. */
export async function readUserRole(strapi: Core.Strapi, userId: number) {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
    populate: ['role'],
  });

  return user?.role;
}

export async function readUser(strapi: Core.Strapi, userId: number) {
  return strapi.db.query(USER_UID).findOne({ where: { id: userId } });
}

export interface ApiResponse {
  status: number;
  // Decoded JSON, whose shape differs per endpoint and is asserted ad hoc by
  // each test. Narrowing it here would only push casts into every assertion.
  // biome-ignore lint/suspicious/noExplicitAny: arbitrary API response body
  body: any;
}

/** A request against the booted instance, as an outside client would make it. */
export async function apiRequest(
  baseUrl: string,
  method: string,
  route: string,
  options: { jwt?: string; body?: unknown } = {},
): Promise<ApiResponse> {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.jwt ? { Authorization: `Bearer ${options.jwt}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // A response without a JSON body is fine; the status is what matters.
  }

  return { status: response.status, body };
}

export const errorMessage = (response: ApiResponse): string => response.body?.error?.message ?? '';
