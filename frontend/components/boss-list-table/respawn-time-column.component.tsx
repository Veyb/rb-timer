import moment from 'moment';
import { Space, Tooltip } from 'antd';
import { useEffect } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';

import { Boss } from '../../types';
import { HOUR, MINUTE } from '../../constants';
import { updateBossTime } from '../../lib/api';

import styles from './boss-list-table.module.css';

function getTooltipText(boss: Boss) {
  const timeOfDeath = moment(boss.time);
  const hoursOfDeath = timeOfDeath.hours().toString().padStart(2, '0');
  const minutesOfDeath = timeOfDeath.minutes().toString().padStart(2, '0');

  return `Время фарма ${hoursOfDeath}:${minutesOfDeath}`;
}

function getOutputTime(boss: Boss, isRemainingTime: boolean) {
  const date = moment(boss.respawnTime);
  const hours = date.hours().toString().padStart(2, '0');
  const minutes = date.minutes().toString().padStart(2, '0');

  const diff = date.diff(moment());
  const diffAbs = Math.abs(diff);
  const diffHours = Math.floor(diffAbs / HOUR)
    .toString()
    .padStart(2, '0');
  const diffMinutes = Math.floor((diffAbs / MINUTE) % 60)
    .toString()
    .padStart(2, '0');

  return isRemainingTime
    ? `${diff < 0 ? '-' : ''}${diffHours}:${diffMinutes}`
    : `${hours}:${minutes}`;
}

interface RespawnTimeColumnProps {
  boss: Boss;
  isRemainingTime: boolean;
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
  isRemainingTime,
}: RespawnTimeColumnProps) => {
  useEffect(() => {
    const bossNotRespawned =
      !boss.world &&
      moment().valueOf() >
        moment(boss.respawnTime).add(20, 'minutes').valueOf();
    const shouldUpdateWorld =
      boss.world && moment().valueOf() > boss.respawnTime;

    if (shouldUpdateWorld) {
      const timeOfDeath = getTimeOfDeath(boss);
      updateBossTime(boss.id, timeOfDeath).then((newBossApiInfo) =>
        updateBossList(newBossApiInfo)
      );
    }

    if (bossNotRespawned) {
      updateBossTime(
        boss.id,
        moment(boss.respawnTime).toISOString(),
        true
      ).then((newBossApiInfo) => updateBossList(newBossApiInfo));
    }
  }, [boss, updateBossList]);

  const tooltipText = getTooltipText(boss);
  const outputTime = getOutputTime(boss, isRemainingTime);
  const isOutOfDate = moment().valueOf() > boss.respawnTime;

  return (
    <Tooltip placement="top" title={tooltipText}>
      <Space size="middle">
        <span style={{ position: 'relative' }}>
          {boss.approximately && (
            <span className={styles.approximately}>~</span>
          )}
          {outputTime}
          {isOutOfDate && (
            <QuestionCircleOutlined className={styles.outDateIcon} />
          )}
        </span>
      </Space>
    </Tooltip>
  );
};
