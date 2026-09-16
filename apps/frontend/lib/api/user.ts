// global modules
import axios from 'axios';

// local modules
import type { User } from '../../types';
import { API_URL, apiGet, authHeaders } from './base';

/**
 * Own account only. Reading or writing anyone else went through `/users` and
 * `/users/:id`, which answered with no community scope; those are refused for
 * every role now, and `lib/api/community-member.ts` replaces them.
 */

export async function getUsersMe(token: string) {
  return await apiGet<User>('/users/me', authHeaders(token));
}

/**
 * `PUT /users/me` is still there and `user-account-updates` still defines what
 * it accepts, but nothing in the client calls it any more: its one caller wrote
 * `collections`, and that attribute went with the item collection feature. A
 * profile editor would add the call back against the surviving attributes.
 */

/**
 * Deletes the caller's own account. Takes no target — this is what replaced
 * `DELETE /users/:id`, which could be aimed at anyone.
 */
export async function deleteOwnAccount(token: string | undefined) {
  const { data } = await axios.delete(`${API_URL}/users/me`, authHeaders(token));

  return data as { deleted: boolean };
}
