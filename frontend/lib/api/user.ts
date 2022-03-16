// global modules
import axios, { AxiosRequestHeaders } from 'axios';

// local modules
import { User } from '../../types';
import { apiGet, API_URL, flattenApiResponse, apiDelete } from './base';

export async function getUser(id: string, token: string | undefined) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await apiGet(`/users/${id}`, params);
}

export async function getUsers(token: string | undefined) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await apiGet(`/users`, params);
}

export async function getUsersMe(token: string) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await apiGet('/users/me', params);
}

interface UpdateUserParams extends Pick<User, 'collections'> {
  role: number;
}

export async function updateUser(
  userId: number,
  params: Partial<UpdateUserParams>,
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

export async function updateUsersMe(
  params: Partial<UpdateUserParams>,
  token: string | undefined
) {
  const headers: AxiosRequestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.put(
    `${API_URL}/users/me`,
    {
      ...params,
    },
    { headers: { ...headers } }
  );

  return flattenApiResponse(data);
}

export async function deleteUser(id: string, token: string | undefined) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  return await apiDelete(`/users/${id}`, params);
}
