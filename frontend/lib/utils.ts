import moment from 'moment';

import { BossApiResponse } from '../types';

export const expandBoss = (boss: BossApiResponse) => {
  const date = moment(boss.time);
  date.hours(date.hours() + boss.interval);
  return { ...boss, respawnTime: +date };
};

export const expandBossList = (bossList: BossApiResponse[]) => {
  return bossList.map(expandBoss);
};
