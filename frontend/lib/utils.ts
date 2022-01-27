import { BossApiResponse } from '../types';

export const expandBoss = (boss: BossApiResponse) => {
  const date = new Date(boss.time);
  date.setHours(date.getHours() + boss.interval);
  return { ...boss, respawnTime: +date };
};

export const expandBossList = (bossList: BossApiResponse[]) => {
  return bossList.map(expandBoss);
};
