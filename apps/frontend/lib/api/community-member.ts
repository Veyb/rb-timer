// global modules
import axios from 'axios';

// local modules
import type { CommunityMember, RoleType } from '../../types';
import { API_URL, apiGet, authHeaders, jsonHeaders } from './base';

/**
 * The only way member data reaches this app. `/users` and `/users/:id` are
 * refused for every role: they answered with no community scope at all, so
 * these endpoints replace them and scope every answer to the caller's own
 * community server-side.
 */

export async function getCommunityMembers(token: string | undefined) {
  return apiGet<CommunityMember[]>('/community/members', authHeaders(token));
}

export async function getCommunityMember(documentId: string, token: string | undefined) {
  return apiGet<CommunityMember>(`/community/members/${documentId}`, authHeaders(token));
}

/** Changes one member's role and nothing else — the endpoint takes no more. */
export async function updateCommunityMemberRole(
  memberDocumentId: string,
  role: RoleType,
  token: string | undefined,
) {
  const { data } = await axios.put(
    `${API_URL}/community/members/${memberDocumentId}/role`,
    { role },
    jsonHeaders(token),
  );

  return data as CommunityMember;
}

/** The caller leaves their own community. Takes no target. */
export async function leaveCommunity(token: string | undefined) {
  const { data } = await axios.delete(`${API_URL}/community/members/me`, authHeaders(token));

  return data as { left: boolean };
}

/** An officer removes a member of their own community. */
export async function removeCommunityMember(memberDocumentId: string, token: string | undefined) {
  const { data } = await axios.delete(
    `${API_URL}/community/members/${memberDocumentId}`,
    authHeaders(token),
  );

  return data as { removed: boolean };
}
