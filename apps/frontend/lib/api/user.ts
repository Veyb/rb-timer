// global modules
import axios from 'axios';

// local modules
import type { User } from '../../types';
import { API_URL, apiGet, authHeaders, flattenApiResponse, jsonHeaders } from './base';

/**
 * Own account only. Reading or writing anyone else went through `/users` and
 * `/users/:id`, which answered with no community scope; those are refused for
 * every role now, and `lib/api/community-member.ts` replaces them.
 */

export async function getUsersMe(token: string) {
  return await apiGet<User>('/users/me', authHeaders(token));
}

type UpdateUserParams = Pick<User, 'collections'>;

export async function updateUsersMe(params: Partial<UpdateUserParams>, token: string | undefined) {
  const { data } = await axios.put(`${API_URL}/users/me`, { ...params }, jsonHeaders(token));

  return flattenApiResponse(data) as User;
}

/**
 * Deletes the caller's own account. Takes no target — this is what replaced
 * `DELETE /users/:id`, which could be aimed at anyone.
 */
export async function deleteOwnAccount(token: string | undefined) {
  const { data } = await axios.delete(`${API_URL}/users/me`, authHeaders(token));

  return data as { deleted: boolean };
}
