// Issuing, listing, revoking and redeeming invite codes — specs/community-invites.
//
// Uses the real seeded roles: `global::is-officer` matches on the role type,
// redemption grants `viewer` by type, and the redeem action is granted to the
// registration default only, so none of that can be stood in for by a
// synthetic role.
//
// The one scenario absent here is the concurrent redemption of a single-use
// code. It needs row locking, which SQLite compiles away — see
// `tests/postgres/invite-code-concurrency.test.ts`, which runs against the
// database the application actually uses.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createInviteCode,
  createUser,
  errorMessage,
  findRole,
  readInviteCode,
  readInviteCodeByDocumentId,
  readUserRole,
  setUserCommunity,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const USER_UID = 'plugin::users-permissions.user';
const REDEMPTION_UID = 'api::invite-redemption.invite-redemption';

let strapi: Core.Strapi;
let baseUrl: string;

let defaultRoleId: number;
let viewerRoleId: number;
let editorRoleId: number;
let officerRoleId: number;

const communityOf = async (userId: number) => {
  const user = await strapi.db
    .query(USER_UID)
    .findOne({ where: { id: userId }, populate: ['community'] });

  return user?.community ?? null;
};

/** A community with an officer of its own, so tests do not share state. */
const makeCommunity = async (name: string) => {
  const community = await createCommunity(strapi, { name, server: 'Black' });
  const officer = await createUser(strapi, officerRoleId);
  await setUserCommunity(strapi, officer.id, community.id);

  return { community, officer };
};

/** Someone who has registered and nothing more: the only role that may redeem. */
const makeNewcomer = () => createUser(strapi, defaultRoleId);

const redeem = (jwt: string, body: Record<string, unknown>) =>
  apiRequest(baseUrl, 'POST', '/api/invite-codes/redeem', { jwt, body });

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

describe('POST /community/invite-codes', () => {
  it('binds a new code to the issuing officer own community', async () => {
    const { community, officer } = await makeCommunity('Issue Own');

    const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
      jwt: officer.jwt,
      body: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(response.body.usedCount).toBe(0);
    expect(response.body.issuedBy.documentId).toBe(officer.documentId);

    const stored = await readInviteCodeByDocumentId(strapi, response.body.documentId);
    expect(stored.community.id).toBe(community.id);
  });

  it('refuses a request that names another community', async () => {
    const { officer } = await makeCommunity('Issue Naming A');
    const { community: other } = await makeCommunity('Issue Naming B');

    const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
      jwt: officer.jwt,
      body: { community: other.id },
    });

    // The body allowlist has no `community` field, so the binding cannot be
    // influenced — and an attempt to influence it is reported rather than
    // silently dropped, as with every other body in this codebase.
    expect(response.status).toBe(400);

    const codes = await strapi.db
      .query('api::invite-code.invite-code')
      .findMany({ where: { community: other.id } });
    expect(codes).toHaveLength(0);
  });

  it('rejects a use limit below one', async () => {
    const { officer } = await makeCommunity('Issue Limit');

    for (const maxUses of [0, -1]) {
      const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
        jwt: officer.jwt,
        body: { maxUses },
      });

      expect(response.status).toBe(400);
    }
  });

  it('rejects an expiry in the past', async () => {
    const { officer } = await makeCommunity('Issue Expiry');

    const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
      jwt: officer.jwt,
      body: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
    });

    expect(response.status).toBe(400);
  });

  it('stores the use limit and the expiry it is given', async () => {
    const { officer } = await makeCommunity('Issue Limited');
    const expiresAt = new Date(Date.now() + 86_400_000);

    const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
      jwt: officer.jwt,
      body: { maxUses: 5, expiresAt: expiresAt.toISOString() },
    });

    expect(response.status).toBe(200);
    expect(response.body.maxUses).toBe(5);
    expect(response.body.remainingUses).toBe(5);
    expect(new Date(response.body.expiresAt).getTime()).toBe(expiresAt.getTime());
  });

  it('refuses a viewer, an editor and an officer with no community', async () => {
    const { community } = await makeCommunity('Issue Refused');

    const viewer = await createUser(strapi, viewerRoleId);
    await setUserCommunity(strapi, viewer.id, community.id);
    const editor = await createUser(strapi, editorRoleId);
    await setUserCommunity(strapi, editor.id, community.id);
    const strandedOfficer = await createUser(strapi, officerRoleId);

    for (const caller of [viewer, editor, strandedOfficer]) {
      const response = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
        jwt: caller.jwt,
        body: {},
      });

      expect(response.status).toBe(403);
    }

    const codes = await strapi.db
      .query('api::invite-code.invite-code')
      .findMany({ where: { community: community.id } });
    expect(codes).toHaveLength(0);
  });
});

describe('GET /community/invite-codes', () => {
  it('lists only the codes of the caller own community', async () => {
    const { community: alpha, officer: alphaOfficer } = await makeCommunity('List Alpha');
    const { community: beta } = await makeCommunity('List Beta');

    const own = await createInviteCode(strapi, alpha.id);
    const foreign = await createInviteCode(strapi, beta.id);

    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-codes', {
      jwt: alphaOfficer.jwt,
    });

    expect(response.status).toBe(200);
    expect(response.body.map((entry) => entry.code)).toEqual([own.code]);
    expect(JSON.stringify(response.body)).not.toContain(foreign.code);
  });

  it('shows remaining uses and expiry', async () => {
    const { community, officer } = await makeCommunity('List Detail');
    const expiresAt = new Date(Date.now() + 86_400_000);
    await createInviteCode(strapi, community.id, { maxUses: 3, usedCount: 1, expiresAt });

    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-codes', {
      jwt: officer.jwt,
    });

    expect(response.body[0].maxUses).toBe(3);
    expect(response.body[0].usedCount).toBe(1);
    expect(response.body[0].remainingUses).toBe(2);
    expect(new Date(response.body[0].expiresAt).getTime()).toBe(expiresAt.getTime());
  });

  it('reports an unlimited code as having no ceiling rather than none left', async () => {
    const { community, officer } = await makeCommunity('List Unlimited');
    await createInviteCode(strapi, community.id, { maxUses: null, usedCount: 7 });

    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-codes', {
      jwt: officer.jwt,
    });

    expect(response.body[0].maxUses).toBeNull();
    expect(response.body[0].remainingUses).toBeNull();
    expect(response.body[0].expiresAt).toBeNull();
  });

  it('shows who redeemed a code and when', async () => {
    const { community, officer } = await makeCommunity('List Redemptions');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();

    expect((await redeem(newcomer.jwt, { code: code.code })).status).toBe(200);

    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-codes', {
      jwt: officer.jwt,
    });

    expect(response.body[0].redemptions).toHaveLength(1);
    expect(response.body[0].redemptions[0].user.documentId).toBe(newcomer.documentId);
    expect(Number.isNaN(Date.parse(response.body[0].redemptions[0].redeemedAt))).toBe(false);
  });
});

describe('POST /community/invite-codes/:id/revoke', () => {
  it('revokes a code of the caller own community and stops it working', async () => {
    const { community, officer } = await makeCommunity('Revoke Own');
    const code = await createInviteCode(strapi, community.id);

    const response = await apiRequest(
      baseUrl,
      'POST',
      `/api/community/invite-codes/${code.documentId}/revoke`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.revokedAt).not.toBeNull();

    const newcomer = await makeNewcomer();
    expect((await redeem(newcomer.jwt, { code: code.code })).status).toBe(403);
    expect(await communityOf(newcomer.id)).toBeNull();
  });

  it('keeps the code row, so its redemptions stay attributable', async () => {
    const { community, officer } = await makeCommunity('Revoke Keeps');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();
    await redeem(newcomer.jwt, { code: code.code });

    await apiRequest(baseUrl, 'POST', `/api/community/invite-codes/${code.documentId}/revoke`, {
      jwt: officer.jwt,
    });

    const response = await apiRequest(baseUrl, 'GET', '/api/community/invite-codes', {
      jwt: officer.jwt,
    });
    expect(response.body[0].redemptions[0].user.documentId).toBe(newcomer.documentId);
  });

  it('answers as not-found for a code of another community, and leaves it usable', async () => {
    const { officer: alphaOfficer } = await makeCommunity('Revoke Foreign A');
    const { community: beta } = await makeCommunity('Revoke Foreign B');
    const foreign = await createInviteCode(strapi, beta.id);

    const response = await apiRequest(
      baseUrl,
      'POST',
      `/api/community/invite-codes/${foreign.documentId}/revoke`,
      {
        jwt: alphaOfficer.jwt,
      },
    );

    expect(response.status).toBe(404);

    const stored = await readInviteCode(strapi, foreign.id);
    expect(stored.revokedAt).toBeNull();

    const newcomer = await makeNewcomer();
    expect((await redeem(newcomer.jwt, { code: foreign.code })).status).toBe(200);
  });
});

describe('POST /invite-codes/redeem', () => {
  it('admits a community-less user as a viewer', async () => {
    const { community } = await makeCommunity('Redeem Grant');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();

    const response = await redeem(newcomer.jwt, { code: code.code });

    expect(response.status).toBe(200);
    expect(response.body.community.name).toBe('Redeem Grant');

    expect((await communityOf(newcomer.id)).id).toBe(community.id);
    expect((await readUserRole(strapi, newcomer.id)).type).toBe('viewer');
  });

  it('counts the use and records the redemption', async () => {
    const { community } = await makeCommunity('Redeem Counts');
    const code = await createInviteCode(strapi, community.id, { maxUses: 5 });
    const newcomer = await makeNewcomer();

    await redeem(newcomer.jwt, { code: code.code });

    const stored = await readInviteCode(strapi, code.id);
    expect(stored.usedCount).toBe(1);

    const redemptions = await strapi.db
      .query(REDEMPTION_UID)
      .findMany({ where: { inviteCode: code.id }, populate: { user: true } });

    expect(redemptions).toHaveLength(1);
    expect(redemptions[0].user.id).toBe(newcomer.id);
    expect(Number.isNaN(new Date(redemptions[0].redeemedAt).getTime())).toBe(false);
  });

  it('copies the code, the issuer and the joiner onto the record', async () => {
    // The relations alongside these are all breakable — a code an operator
    // deletes, an account that deletes itself. The snapshot is what makes the
    // record still say who admitted whom afterwards.
    const { community, officer } = await makeCommunity('Redeem Snapshot');
    const issued = await apiRequest(baseUrl, 'POST', '/api/community/invite-codes', {
      jwt: officer.jwt,
      body: {},
    });
    const newcomer = await makeNewcomer();

    await redeem(newcomer.jwt, { code: issued.body.code });

    const [record] = await strapi.db
      .query(REDEMPTION_UID)
      .findMany({ where: { codeValue: issued.body.code }, populate: { community: true } });

    expect(record.codeValue).toBe(issued.body.code);
    expect(record.issuedByUsername).toBe(officer.username);
    expect(record.redeemedByUsername).toBe(newcomer.username);
    expect(record.community.id).toBe(community.id);
  });

  it('accepts the code however it was copied', async () => {
    const { community } = await makeCommunity('Redeem Mangled');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();

    const response = await redeem(newcomer.jwt, {
      code: `  ${code.code.toLowerCase().replaceAll('-', ' ')}  `,
    });

    expect(response.status).toBe(200);
  });

  it('lets a multi-use code through up to its limit and no further', async () => {
    const { community } = await makeCommunity('Redeem Multi');
    const code = await createInviteCode(strapi, community.id, { maxUses: 3 });

    for (let use = 0; use < 3; use += 1) {
      const newcomer = await makeNewcomer();
      expect((await redeem(newcomer.jwt, { code: code.code })).status).toBe(200);
    }

    const fourth = await makeNewcomer();
    expect((await redeem(fourth.jwt, { code: code.code })).status).toBe(403);
    expect(await communityOf(fourth.id)).toBeNull();

    expect((await readInviteCode(strapi, code.id)).usedCount).toBe(3);
  });

  it('refuses a caller who already belongs to a community, and changes nothing', async () => {
    const { community: alpha } = await makeCommunity('Redeem Member A');
    const { community: beta } = await makeCommunity('Redeem Member B');

    // Deliberately the registration default rather than a community role. That
    // is the one shape that reaches the handler at all — `redeem` is granted to
    // this role only — so it is the only way to exercise the guard instead of
    // the permission layer. An operator assigning a community from the admin
    // panel without raising the role produces exactly this account.
    const member = await createUser(strapi, defaultRoleId);
    await setUserCommunity(strapi, member.id, alpha.id);
    const betaCode = await createInviteCode(strapi, beta.id);

    const response = await redeem(member.jwt, { code: betaCode.code });

    expect(response.status).toBe(403);
    expect(errorMessage(response)).toContain('already belong');
    expect((await communityOf(member.id)).id).toBe(alpha.id);
    expect((await readUserRole(strapi, member.id)).type).toBe('authenticated');
    expect((await readInviteCode(strapi, betaCode.id)).usedCount).toBe(0);
  });

  it('refuses a member on any role, not only the default one', async () => {
    // Every signed-in role holds the action — see JOIN_BY_INVITE in
    // seed-roles-and-permissions — so the guard, not the permission layer, is
    // what keeps a member of one community out of another.
    const { community: alpha } = await makeCommunity('Redeem Member Roles A');
    const { community: beta } = await makeCommunity('Redeem Member Roles B');
    const betaCode = await createInviteCode(strapi, beta.id);

    for (const roleId of [viewerRoleId, editorRoleId, officerRoleId]) {
      const member = await createUser(strapi, roleId);
      await setUserCommunity(strapi, member.id, alpha.id);

      const response = await redeem(member.jwt, { code: betaCode.code });

      expect(response.status).toBe(403);
      expect(errorMessage(response)).toContain('already belong');
      expect((await communityOf(member.id)).id).toBe(alpha.id);
    }

    expect((await readInviteCode(strapi, betaCode.id)).usedCount).toBe(0);
  });

  it('admits a user who holds a role but no community', async () => {
    // An operator can raise a role in the admin panel without assigning a
    // community, and the frontend shows the invite form to anyone without one.
    // That account has to be able to use the form it is shown.
    const { community } = await makeCommunity('Redeem Stranded');
    const code = await createInviteCode(strapi, community.id);
    const stranded = await createUser(strapi, editorRoleId);

    const response = await redeem(stranded.jwt, { code: code.code });

    expect(response.status).toBe(200);
    expect((await communityOf(stranded.id)).id).toBe(community.id);
    // Still `viewer`: an invite never confirms a role someone already held.
    expect((await readUserRole(strapi, stranded.id)).type).toBe('viewer');
  });

  it('refuses a request that names a role, and grants nothing', async () => {
    const { community } = await makeCommunity('Redeem Role');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();

    const response = await redeem(newcomer.jwt, { code: code.code, role: officerRoleId });

    // The body allowlist has no role field, so a role can never reach the
    // handler; the handler in turn hardcodes `viewer`. Both hold here: the
    // request is refused and the account is untouched.
    expect(response.status).toBe(400);
    expect(await communityOf(newcomer.id)).toBeNull();
    expect((await readUserRole(strapi, newcomer.id)).type).toBe('authenticated');
  });

  it('refuses an unauthenticated caller', async () => {
    const { community } = await makeCommunity('Redeem Anonymous');
    const code = await createInviteCode(strapi, community.id);

    const response = await redeem(undefined as unknown as string, { code: code.code });

    expect([401, 403]).toContain(response.status);
    expect((await readInviteCode(strapi, code.id)).usedCount).toBe(0);
  });

  it('answers unknown, revoked, expired and exhausted codes identically', async () => {
    const { community } = await makeCommunity('Redeem Opaque');

    const revoked = await createInviteCode(strapi, community.id, { revokedAt: new Date() });
    const expired = await createInviteCode(strapi, community.id, {
      expiresAt: new Date(Date.now() - 60_000),
    });
    const exhausted = await createInviteCode(strapi, community.id, { maxUses: 1, usedCount: 1 });

    const newcomer = await makeNewcomer();
    const attempts = ['ZZZZ-ZZZZ-ZZZZ', revoked.code, expired.code, exhausted.code];
    const responses = [];

    for (const code of attempts) {
      responses.push(await redeem(newcomer.jwt, { code }));
    }

    for (const response of responses) {
      expect(response.status).toBe(responses[0].status);
      expect(errorMessage(response)).toBe(errorMessage(responses[0]));
      // Nothing that would tell a prober which community, if any, is behind a
      // submitted code. The numeric id is not checked as a substring on
      // purpose — a one-digit id would match the "403" in the status.
      expect(JSON.stringify(response.body)).not.toContain('Redeem Opaque');
      expect(JSON.stringify(response.body)).not.toContain(community.documentId);
    }

    expect(await communityOf(newcomer.id)).toBeNull();
  });

  it('is granted to the role registration hands out, so a newcomer can use it', async () => {
    const { community } = await makeCommunity('Redeem Permission');
    const code = await createInviteCode(strapi, community.id);
    const newcomer = await makeNewcomer();

    expect((await readUserRole(strapi, newcomer.id)).type).toBe('authenticated');
    expect((await redeem(newcomer.jwt, { code: code.code })).status).toBe(200);
  });

  it('throttles a caller who keeps submitting codes', async () => {
    const { community } = await makeCommunity('Redeem Throttle');
    await createInviteCode(strapi, community.id);
    const prober = await makeNewcomer();

    const statuses = [];

    for (let attempt = 0; attempt < 12; attempt += 1) {
      statuses.push((await redeem(prober.jwt, { code: 'ZZZZ-ZZZZ-ZZZZ' })).status);
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(403));
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('throttles per account, so one prober does not lock anyone else out', async () => {
    const { community } = await makeCommunity('Redeem Throttle Scope');
    const code = await createInviteCode(strapi, community.id);
    const prober = await makeNewcomer();

    for (let attempt = 0; attempt < 11; attempt += 1) {
      await redeem(prober.jwt, { code: 'ZZZZ-ZZZZ-ZZZZ' });
    }

    expect((await redeem(prober.jwt, { code: code.code })).status).toBe(429);

    const bystander = await makeNewcomer();
    expect((await redeem(bystander.jwt, { code: code.code })).status).toBe(200);
  });
});
