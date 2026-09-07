// global modules
import axios, { type RawAxiosRequestHeaders } from 'axios';

// local modules
import type { CommunityMember } from '../../types';
import { API_URL, apiGet, flattenApiResponse } from './base';

/**
 * The only way member data reaches this app. `/users` and `/users/:id` are
 * refused for every role: they answered with no community scope at all, so
 * these endpoints replace them and scope every answer to the caller's own
 * community server-side.
 */

const authHeaders = (token: string | undefined) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export async function getCommunityMembers(token: string | undefined) {
  return (await apiGet('/community/members', authHeaders(token))) as CommunityMember[];
}

export async function getCommunityMember(id: string, token: string | undefined) {
  return (await apiGet(`/community/members/${id}`, authHeaders(token))) as CommunityMember;
}

/** Changes one member's role and nothing else — the endpoint takes no more. */
export async function updateCommunityMemberRole(
  memberId: number,
  role: number,
  token: string | undefined,
) {
  const headers: RawAxiosRequestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.put(
    `${API_URL}/community/members/${memberId}/role`,
    { role },
    { headers },
  );

  return flattenApiResponse(data) as CommunityMember;
}

/** The caller leaves their own community. Takes no target. */
export async function leaveCommunity(token: string | undefined) {
  const { data } = await axios.delete(`${API_URL}/community/members/me`, authHeaders(token));

  return data as { left: boolean };
}

/** An officer removes a member of their own community. */
export async function removeCommunityMember(memberId: number, token: string | undefined) {
  const { data } = await axios.delete(
    `${API_URL}/community/members/${memberId}`,
    authHeaders(token),
  );

  return data as { removed: boolean };
}
