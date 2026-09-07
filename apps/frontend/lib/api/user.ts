// global modules
import axios, { type RawAxiosRequestHeaders } from 'axios';

// local modules
import type { User } from '../../types';
import { API_URL, apiGet, flattenApiResponse } from './base';

/**
 * Own account only. Reading or writing anyone else went through `/users` and
 * `/users/:id`, which answered with no community scope; those are refused for
 * every role now, and `lib/api/community-member.ts` replaces them.
 */

export async function getUsersMe(token: string) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await apiGet('/users/me', params);
}

type UpdateUserParams = Pick<User, 'collections'>;

export async function updateUsersMe(params: Partial<UpdateUserParams>, token: string | undefined) {
  const headers: RawAxiosRequestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.put(
    `${API_URL}/users/me`,
    {
      ...params,
    },
    { headers: { ...headers } },
  );

  return flattenApiResponse(data) as User;
}

/**
 * Deletes the caller's own account. Takes no target — this is what replaced
 * `DELETE /users/:id`, which could be aimed at anyone.
 */
export async function deleteOwnAccount(token: string | undefined) {
  const { data } = await axios.delete(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data as { deleted: boolean };
}
