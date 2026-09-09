// Covers leaving a community, being removed from one, and deleting your own
// account — specs/community and specs/user-account-updates.
//
// Uses the real seeded roles throughout: `global::is-officer` matches on the
// role type, and detaching resets to whatever the plugin's `default_role`
// setting names, so a synthetic role would not exercise either.
import type { Core } from '@strapi/strapi';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiRequest,
  createCommunity,
  createUser,
  findRole,
  readUser,
  readUserRole,
  setUserCommunity,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

const USER_UID = 'plugin::users-permissions.user';

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

/** A community with its own officer, so each test starts from a clean state. */
const makeCommunity = async (name: string) => {
  const community = await createCommunity(strapi, { name, server: 'Black' });
  const officer = await createUser(strapi, officerRoleId);
  await setUserCommunity(strapi, officer.id, community.id);

  return { community, officer };
};

const addMember = async (communityId: number | string, roleId: number) => {
  const member = await createUser(strapi, roleId);
  await setUserCommunity(strapi, member.id, communityId);

  return member;
};

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

describe('a member may leave their community', () => {
  it('clears the membership and resets the role', async () => {
    const { community } = await makeCommunity('Leave Basic');
    const member = await addMember(community.id, editorRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', {
      jwt: member.jwt,
    });

    expect(response.status).toBe(200);
    expect(await communityOf(member.id)).toBeNull();
    expect((await readUserRole(strapi, member.id)).id).toBe(defaultRoleId);
  });

  it('refuses a caller who belongs to no community', async () => {
    const homeless = await createUser(strapi, viewerRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', {
      jwt: homeless.jwt,
    });

    expect(response.status).toBe(403);
  });

  it('leaves other members of the community alone', async () => {
    const { community, officer } = await makeCommunity('Leave Isolated');
    const stays = await addMember(community.id, viewerRoleId);
    const goes = await addMember(community.id, viewerRoleId);

    await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', { jwt: goes.jwt });

    expect(await communityOf(stays.id)).not.toBeNull();
    expect((await readUserRole(strapi, stays.id)).id).toBe(viewerRoleId);
    expect(await communityOf(officer.id)).not.toBeNull();
  });
});

describe('the last officer of a community may not leave it', () => {
  it('refuses the sole officer', async () => {
    const { officer } = await makeCommunity('Sole Officer');

    const response = await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', {
      jwt: officer.jwt,
    });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/last officer/i);
    expect(await communityOf(officer.id)).not.toBeNull();
    expect((await readUserRole(strapi, officer.id)).id).toBe(officerRoleId);
  });

  it('allows an officer once another officer exists', async () => {
    const { community, officer } = await makeCommunity('Two Officers');
    await addMember(community.id, officerRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', {
      jwt: officer.jwt,
    });

    expect(response.status).toBe(200);
    expect(await communityOf(officer.id)).toBeNull();
  });

  it('does not block a non-officer who happens to be the only member', async () => {
    const community = await createCommunity(strapi, { name: 'Lonely Viewer' });
    const member = await addMember(community.id, viewerRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', {
      jwt: member.jwt,
    });

    expect(response.status).toBe(200);
  });
});

describe('an officer may remove a member from their community', () => {
  it('clears the membership and resets the role', async () => {
    const { community, officer } = await makeCommunity('Remove Basic');
    const member = await addMember(community.id, editorRoleId);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${member.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(200);
    expect(await communityOf(member.id)).toBeNull();
    expect((await readUserRole(strapi, member.id)).id).toBe(defaultRoleId);
  });

  it('may remove a fellow officer', async () => {
    const { community, officer } = await makeCommunity('Remove Officer');
    const other = await addMember(community.id, officerRoleId);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${other.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(200);
    expect(await communityOf(other.id)).toBeNull();
  });

  it('refuses a self-target, pointing at the leave endpoint', async () => {
    const { officer } = await makeCommunity('Remove Self');

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${officer.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/leave/i);
    expect(await communityOf(officer.id)).not.toBeNull();
  });

  it('answers as not-found for a member of another community', async () => {
    const { officer } = await makeCommunity('Remove Foreign A');
    const { community: other } = await makeCommunity('Remove Foreign B');
    const outsider = await addMember(other.id, viewerRoleId);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${outsider.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(404);
    expect(await communityOf(outsider.id)).not.toBeNull();
    expect((await readUserRole(strapi, outsider.id)).id).toBe(viewerRoleId);
  });

  it('answers as not-found for a community-less user', async () => {
    const { officer } = await makeCommunity('Remove Homeless');
    const homeless = await createUser(strapi, viewerRoleId);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${homeless.documentId}`,
      {
        jwt: officer.jwt,
      },
    );

    expect(response.status).toBe(404);
  });

  it.each([
    ['viewer', () => viewerRoleId],
    ['editor', () => editorRoleId],
  ])('refuses a %s', async (_label, roleId) => {
    const { community } = await makeCommunity(`Remove By ${_label}`);
    const actor = await addMember(community.id, roleId());
    const target = await addMember(community.id, viewerRoleId);

    const response = await apiRequest(
      baseUrl,
      'DELETE',
      `/api/community/members/${target.documentId}`,
      {
        jwt: actor.jwt,
      },
    );

    expect(response.status).toBe(403);
    expect(await communityOf(target.id)).not.toBeNull();
  });
});

describe('a user may delete their own account', () => {
  it('removes the account and its membership', async () => {
    const { community } = await makeCommunity('Delete Member');
    const member = await addMember(community.id, viewerRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/users/me', { jwt: member.jwt });

    expect(response.status).toBe(200);
    expect(await readUser(strapi, member.id)).toBeNull();

    const links = await strapi.db.connection.raw(
      'SELECT COUNT(*) AS n FROM up_users_community_lnk WHERE user_id = ?',
      [member.id],
    );
    expect(Number(links[0].n)).toBe(0);
  });

  it('is available to a community-less user on the default role', async () => {
    const stranded = await createUser(strapi, defaultRoleId);

    const response = await apiRequest(baseUrl, 'DELETE', '/api/users/me', { jwt: stranded.jwt });

    expect(response.status).toBe(200);
    expect(await readUser(strapi, stranded.id)).toBeNull();
  });

  it('cannot be aimed at another account', async () => {
    const { community } = await makeCommunity('Delete Other');
    const actor = await addMember(community.id, officerRoleId);
    const victim = await addMember(community.id, viewerRoleId);

    // There is no route that takes a target; the withdrawn one refuses.
    const response = await apiRequest(baseUrl, 'DELETE', `/api/users/${victim.id}`, {
      jwt: actor.jwt,
    });

    expect(response.status).toBe(403);
    expect(await readUser(strapi, victim.id)).not.toBeNull();
  });

  it('refuses an unauthenticated caller', async () => {
    const response = await apiRequest(baseUrl, 'DELETE', '/api/users/me');

    expect(response.status).toBe(403);
  });
});

describe('detaching does not disturb the community itself', () => {
  it('keeps the community after its last member leaves', async () => {
    const community = await createCommunity(strapi, { name: 'Emptied' });
    const member = await addMember(community.id, viewerRoleId);

    await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', { jwt: member.jwt });

    const stored = await strapi.db
      .query('api::community.community')
      .findOne({ where: { id: community.id } });

    expect(stored).not.toBeNull();
    expect(stored.name).toBe('Emptied');
  });
});

/** A detached user should land in exactly the state the gate refuses. */
describe('a detached user is back at the invite-code gate', () => {
  it('reads their own account with no community and the default role', async () => {
    const { community } = await makeCommunity('Detached State');
    const member = await addMember(community.id, editorRoleId);

    await apiRequest(baseUrl, 'DELETE', '/api/community/members/me', { jwt: member.jwt });

    const me = await apiRequest(baseUrl, 'GET', '/api/users/me', { jwt: member.jwt });

    expect(me.status).toBe(200);
    expect(me.body.community).toBeNull();
    expect(me.body.role.type).toBe('authenticated');
  });
});
