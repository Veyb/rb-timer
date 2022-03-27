// global modules
import moment from 'moment';

export function getNewRespawnTime(respawnTime: number, interval: number) {
  const currentDate = moment();
  const respawnDate = moment(respawnTime);

  while (!respawnDate.isAfter(currentDate)) {
    respawnDate.add(interval, 'hours');
  }

  return respawnDate.add(-interval, 'hours').toISOString();
}
