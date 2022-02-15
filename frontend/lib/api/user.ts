// global modules
import axios, { AxiosRequestHeaders } from 'axios';

// local modules
import { User } from '../../types';
import { get, API_URL, flattenApiResponse } from './base';

export async function getUsersMe(token: string) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await get('/users/me', params);
}

export async function updateUser(
  userId: number,
  params: Partial<Pick<User, 'collections'>>,
  token: string | undefined
) {
  const headers: AxiosRequestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.put(
    `${API_URL}/users/${userId}`,
    {
      ...params,
    },
    { headers: { ...headers } }
  );

  return flattenApiResponse(data);
}