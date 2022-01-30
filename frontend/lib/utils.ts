import moment from 'moment';

import { BossApiResponse } from '../types';

export const expandBoss = (boss: BossApiResponse) => {
  const date = moment(boss.time);
  date.hours(date.hours() + boss.interval);
  return { ...boss, respawnTime: +date };
};

export const expandBossListAndSort = (bossList: BossApiResponse[]) => {
  return bossList.map(expandBoss).sort((a, b) => a.respawnTime - b.respawnTime);
};
