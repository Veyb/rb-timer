// The record of who was admitted into a community and by whom —
// specs/community-invites, "Admissions are recorded durably".
//
// Two things are being tested here and they are easy to conflate. One is the
// usual community scoping, the same as every other endpoint in this change.
// The other is durability: the record has to keep saying who admitted whom
// after the things it points at are gone, because a record that can be erased
// by the person it incriminates is not a record.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createRole,
  createUser,
  findRole,
  setUserCommunity,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const INVITE_CODE_UID = 'api::invite-code.invite-code';
const REDEMPTION_UID = 'api::invite-redemption.invite-redemption';
const USER_UID = 'plugin::users-permissions.user';

let strapi: Core.Strapi;
let baseUrl: string;

let defaultRoleId: number;
let viewerRoleId: number;
let editorRoleId: number;
let officerRoleId: number;

const makeCommunity = async (name: string) => {
  const community = await createCommunity(strapi, { name, server: 'Black' });
  const officer = await createUser(strapi, officerRoleId);
  await setUserCommunity(strapi, officer.id, community.id);

  return { community, officer };
};

/** Issues a code as the officer and has a fresh newcomer redeem it. */
const admitSomeone = async (officerJwt: string) => {
  const issued = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
    jwt: officerJwt,
    body: {},
  });
  expect(issued.status).toBe(200);

  const joiner = await createUser(strapi, defaultRoleId);
  const redeemed = await apiRequest(baseUrl, 'POST', '/api/invite-codes/redeem', {
    jwt: joiner.jwt,
    body: { code: issued.body.code },
  });
  expect(redeemed.status).toBe(200);

  return { code: issued.body, joiner };
};

const history = (jwt: string) =>
  apiRequest(baseUrl, 'GET', '/api/community/invite-history', { jwt });

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi());

  defaultRoleId = (await findRole(strapi, 'authenticated')).id;
  viewerRoleId = (await findRole(strapi, 'viewer')).id;
  editorRoleId = (await findRole(strapi, 'editor')).id;
  officerRoleId = (await findRole(strapi, 'officer')).id;
});

afterAll(async () => {
  await cleanupStrapi();
});

describe('GET /community/invite-history', () => {
  it('lists who was admitted, when, and on whose invitation', async () => {
    const { officer } = await makeCommunity('History Basic');
    const { code, joiner } = await admitSomeone(officer.jwt);

    const response = await history(officer.jwt);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].code).toBe(code.code);
    expect(response.body[0].issuedByUsername).toBe(officer.username);
    expect(response.body[0].redeemedByUsername).toBe(joiner.username);
    expect(response.body[0].user.documentId).toBe(joiner.documentId);
    expect(Number.isNaN(Date.parse(response.body[0].redeemedAt))).toBe(false);
  });

  it('shows nothing of another community', async () => {
    const { officer: alphaOfficer } = await makeCommunity('History Alpha');
    const { officer: betaOfficer } = await makeCommunity('History Beta');

    const { code: betaCode, joiner: betaJoiner } = await admitSomeone(betaOfficer.jwt);

    const response = await history(alphaOfficer.jwt);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
    expect(JSON.stringify(response.body)).not.toContain(betaCode.code);
    expect(JSON.stringify(response.body)).not.toContain(betaJoiner.username);
  });

  it('refuses a viewer, an editor and an officer with no community', async () => {
    const { community, officer } = await makeCommunity('History Refused');
    await admitSomeone(officer.jwt);

    const viewer = await createUser(strapi, viewerRoleId);
    await setUserCommunity(strapi, viewer.id, community.id);
    const editor = await createUser(strapi, editorRoleId);
    await setUserCommunity(strapi, editor.id, community.id);
    const strandedOfficer = await createUser(strapi, officerRoleId);

    for (const caller of [viewer, editor, strandedOfficer]) {
      expect((await history(caller.jwt)).status).toBe(403);
    }
  });

  it('refuses a caller who holds the action but is not an officer', async () => {
    // The permission layer already keeps `viewer` and `editor` out, so the
    // test above cannot tell whether the route policy does anything. This one
    // grants the action to a role that is not `officer` and belongs to a
    // community — the only shape that reaches the policy and must still be
    // refused by it.
    const { community, officer } = await makeCommunity('History Policy');
    await admitSomeone(officer.jwt);

    const role = await createRole(strapi, `history_probe_${process.pid}`, [
      'api::invite-redemption.invite-redemption.find',
    ]);
    const caller = await createUser(strapi, role.id);
    await setUserCommunity(strapi, caller.id, community.id);

    expect((await history(caller.jwt)).status).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-history');

    expect([401, 403]).toContain(response.status);
  });

  it('discloses no e-mail address', async () => {
    const { officer } = await makeCommunity('History Private');
    const { joiner } = await admitSomeone(officer.jwt);

    const response = await history(officer.jwt);

    expect(JSON.stringify(response.body)).not.toContain(joiner.email);
    expect(JSON.stringify(response.body)).not.toContain(officer.email);
  });
});

describe('the record outlives what it refers to', () => {
  it('still names the issuer and the joiner after the code is deleted', async () => {
    // An operator deleting a code from the admin panel is the only deletion
    // this application has, and it must not be able to erase who admitted whom.
    const { officer } = await makeCommunity('History Code Gone');
    const { code, joiner } = await admitSomeone(officer.jwt);

    await strapi.documents(INVITE_CODE_UID).delete({ documentId: code.documentId });

    const response = await history(officer.jwt);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].code).toBe(code.code);
    expect(response.body[0].issuedByUsername).toBe(officer.username);
    expect(response.body[0].redeemedByUsername).toBe(joiner.username);
    // The live relation is gone, which is exactly what the snapshot covers.
    expect(response.body[0].inviteCodeDocumentId).toBeNull();
  });

  it('still names the joiner after that account deletes itself', async () => {
    const { officer } = await makeCommunity('History Account Gone');
    const { code, joiner } = await admitSomeone(officer.jwt);

    const deleted = await apiRequest(baseUrl, 'DELETE', '/api/users/me', { jwt: joiner.jwt });
    expect(deleted.status).toBe(200);
    expect(await strapi.db.query(USER_UID).findOne({ where: { id: joiner.id } })).toBeNull();

    const response = await history(officer.jwt);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].code).toBe(code.code);
    expect(response.body[0].redeemedByUsername).toBe(joiner.username);
    expect(response.body[0].user).toBeNull();
  });

  it('survives both at once, which is the shape of a cover-up', async () => {
    const { officer } = await makeCommunity('History Both Gone');
    const { code, joiner } = await admitSomeone(officer.jwt);

    await apiRequest(baseUrl, 'DELETE', '/api/users/me', { jwt: joiner.jwt });
    await strapi.documents(INVITE_CODE_UID).delete({ documentId: code.documentId });

    const stored = await strapi.db
      .query(REDEMPTION_UID)
      .findMany({ where: { codeValue: code.code } });

    expect(stored).toHaveLength(1);

    const response = await history(officer.jwt);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].issuedByUsername).toBe(officer.username);
    expect(response.body[0].redeemedByUsername).toBe(joiner.username);
  });
});

describe('an officer cannot delete an invite code', () => {
  it('has no endpoint to do it with', async () => {
    const { officer } = await makeCommunity('No Delete');
    const { code } = await admitSomeone(officer.jwt);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/invite-codes/${code.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    // 404 or 405 — either way there is no route. What matters is that the code
    // and its record are still there afterwards.
    expect(response.status).not.toBe(200);
    expect(
      await strapi.db.query(INVITE_CODE_UID).findOne({ where: { documentId: code.documentId } }),
    ).not.toBeNull();
    expect(await history(officer.jwt)).toMatchObject({ status: 200 });
    expect((await history(officer.jwt)).body).toHaveLength(1);
  });
});
