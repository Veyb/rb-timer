import dayjs from 'dayjs';

import { type Boss, type BossApiResponse } from '../types';

export const expandBoss = (boss: BossApiResponse) => {
  const date = dayjs(boss.time).add(boss.interval, 'hour');
  return { ...boss, respawnTime: date.valueOf() };
};

export function sortBossList(boss: Boss[]) {
  return boss.sort((a, b) => a.respawnTime - b.respawnTime);
}

export const expandBossListAndSort = (bossList: BossApiResponse[]) => {
  return sortBossList(bossList.map(expandBoss));
};

export const isServer = typeof window === 'undefined' ? true : false;
