import moment from 'moment';

import { Boss, BossApiResponse } from '../types';

export const expandBoss = (boss: BossApiResponse) => {
  const date = moment(boss.time);
  date.hours(date.hours() + boss.interval);
  return { ...boss, respawnTime: +date };
};

export function sortBossList(boss: Boss[]) {
  return boss.sort((a, b) => a.respawnTime - b.respawnTime);
}

export const expandBossListAndSort = (bossList: BossApiResponse[]) => {
  return sortBossList(bossList.map(expandBoss));
};
