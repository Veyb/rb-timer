// global modules
import dayjs from 'dayjs';

export function getNewRespawnTime(respawnTime: number, interval: number) {
  const currentDate = dayjs();
  let respawnDate = dayjs(respawnTime);

  while (!respawnDate.isAfter(currentDate)) {
    respawnDate = respawnDate.add(interval, 'hours');
  }

  return respawnDate.add(-interval, 'hours').toISOString();
}
