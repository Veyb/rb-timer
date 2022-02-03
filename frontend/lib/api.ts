import axios, { AxiosRequestHeaders } from 'axios';
import getConfig from 'next/config';
import { BossApiResponse } from '../types';
import { expandBoss, expandBossListAndSort } from './utils';

const { env } = getConfig();
const API_URL = process.env.API_URL || env.API_URL;

export const transformApiResponse = ({ attributes, ...rest }: any) =>
  attributes
    ? {
        ...rest,
        ...attributes,
      }
    : { ...rest };

export const transformListApiResponse = ({ data }: any) => {
  return data.map(transformApiResponse);
};

export async function get(type: string, params?: any) {
  const { data } = await axios.get(`${API_URL}${type}`, params);

  return data.data ? transformListApiResponse(data) : data;
}

export async function post(type: string, params: any) {
  const res = await axios.post(`${API_URL}${type}`, params);

  return res.data;
}

export async function getBossList(token: string | undefined) {
  const params = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
  const bossList = await get('/bosses', params);

  return expandBossListAndSort(bossList);
}

export async function updateBossTime(
  bossId: string,
  params: Partial<Omit<BossApiResponse, 'id' | 'name'>>,
  token: string | undefined
) {
  const headers: AxiosRequestHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await axios.put(
    `${API_URL}/bosses/${bossId}`,
    {
      data: {
        ...params,
      },
    },
    { headers: { ...headers } }
  );

  return expandBoss(transformApiResponse(data.data));
}
