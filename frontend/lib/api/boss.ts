// global modules
import axios, { AxiosRequestHeaders } from 'axios';

// local modules
import { BossApiResponse } from '../../types';
import { apiGet, API_URL, flattenApiResponse } from './base';
import { expandBoss, expandBossListAndSort } from '../utils';

export async function getBossList(token: string | undefined) {
  const params = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;
  const { data, meta } = await apiGet('/bosses', params);

  return expandBossListAndSort(data);
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
        restarted: false,
        ...params,
      },
    },
    { headers: { ...headers } }
  );

  return expandBoss(flattenApiResponse(data.data));
}
