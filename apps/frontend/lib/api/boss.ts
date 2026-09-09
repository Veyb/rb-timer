// global modules
import axios from 'axios';

// local modules
import type { BossApiResponse } from '../../types';
import { expandBoss, expandBossListAndSort } from '../utils';
import { API_URL, apiGetList, authHeaders, flattenApiResponse, jsonHeaders } from './base';

export async function getBossList(token: string | undefined) {
  const { data } = await apiGetList<BossApiResponse>('/bosses', authHeaders(token));

  return expandBossListAndSort(data);
}

export async function updateBossTime(
  documentId: string,
  params: Partial<Omit<BossApiResponse, 'id' | 'documentId' | 'name'>>,
  token: string | undefined,
) {
  const { data } = await axios.put(
    `${API_URL}/bosses/${documentId}`,
    { data: { restarted: false, ...params } },
    jsonHeaders(token),
  );

  return expandBoss(flattenApiResponse(data.data) as BossApiResponse);
}
