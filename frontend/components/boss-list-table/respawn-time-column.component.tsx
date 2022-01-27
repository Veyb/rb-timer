import moment from 'moment';
import { Space, Tooltip } from 'antd';
import { useEffect } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';

import { Boss } from '../../types';
import { expandBoss } from '../../lib/utils';
import { updateBossTime } from '../../lib/api';

import styles from './boss-list-table.module.css';

interface RespawnTimeColumnProps {
  boss: Boss;
  updateBossList: (boss: Boss) => void;
}

function getTimeOfDeath(boss: Boss): string {
  const respawnHours = moment(boss.respawnTime).hours();
  const respawnMinute = moment(boss.respawnTime).minutes();
  const respawnSeconds = moment(boss.respawnTime).seconds();

  const timeOfDeath = moment()
    .hours(respawnHours)
    .minutes(respawnMinute)
    .seconds(respawnSeconds);

  return timeOfDeath.valueOf() > moment().valueOf()
    ? timeOfDeath.add(-1, 'day').toISOString()
    : timeOfDeath.toISOString();
}

export const RespawnTimeColumn = ({
  boss,
  updateBossList,
}: RespawnTimeColumnProps) => {
  useEffect(() => {
    const bossNotRespawned =
      moment().valueOf() >
      moment(boss.respawnTime).add(20, 'minutes').valueOf();
    const shouldUpdateWorld =
      boss.world && moment().valueOf() > boss.respawnTime;

    if (shouldUpdateWorld) {
      const timeOfDeath = getTimeOfDeath(boss);
      updateBossTime(boss.id, timeOfDeath).then((newBossApiInfo) =>
        updateBossList(expandBoss(newBossApiInfo))
      );
    }

    if (bossNotRespawned) {
      updateBossTime(
        boss.id,
        moment(boss.respawnTime).toISOString(),
        true
      ).then((newBossApiInfo) => updateBossList(expandBoss(newBossApiInfo)));
    }
  }, [boss, updateBossList]);

  const date = moment(boss.respawnTime);
  const hours = date.hours().toString().padStart(2, '0');
  const minutes = date.minutes().toString().padStart(2, '0');
  const outOfDate = moment().valueOf() > boss.respawnTime;
  const timeOfDeath = moment(boss.time);
  const hoursOfDeath = timeOfDeath.hours().toString().padStart(2, '0');
  const minutesOfDeath = timeOfDeath.minutes().toString().padStart(2, '0');

  return (
    <Tooltip
      placement="top"
      title={`Время фарма ${hoursOfDeath}:${minutesOfDeath}`}
    >
      <Space size="middle">
        <span style={{ position: 'relative' }}>
          {boss.approximately && (
            <span className={styles.approximately}>~</span>
          )}
          {`${hours}:${minutes}`}
          {outOfDate && (
            <QuestionCircleOutlined className={styles.outDateIcon} />
          )}
        </span>
      </Space>
    </Tooltip>
  );
};
