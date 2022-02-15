// global modules
import axios, { AxiosRequestHeaders } from 'axios';

// local modules
import { BossApiResponse } from '../../types';
import { get, API_URL, flattenApiResponse } from './base';
import { expandBoss, expandBossListAndSort } from '../utils';

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
  bossId: number,
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

  return expandBoss(flattenApiResponse(data.data));
}
