// global modules
import moment, { Moment } from 'moment';
import { useCallback, useEffect, useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../../../types';
import { HOUR, MINUTE } from '../../../../constants';
import { updateBossTime } from '../../../../lib/api';

// style modules
import styles from '../../boss-list-table.module.css';

function getTooltipText(boss: Boss) {
  const timeOfDeath = moment(boss.time);
  const hoursOfDeath = timeOfDeath.hours().toString().padStart(2, '0');
  const minutesOfDeath = timeOfDeath.minutes().toString().padStart(2, '0');

  return `Время фарма ${hoursOfDeath}:${minutesOfDeath}`;
}

function getOutputTime(
  boss: Boss,
  isRemainingTime: boolean,
  editableTime: Moment | null
) {
  const date = moment(editableTime || boss.respawnTime);
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

  return isRemainingTime && !editableTime
    ? `${diff < 0 ? '-' : ''}${diffHours}:${diffMinutes}`
    : `${hours}:${minutes}`;
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

interface RespawnTimeColumnProps {
  boss: Boss;
  editableTime: Moment | null;
  isRemainingTime: boolean;
  updateBossList: (boss: Boss) => void;
  handleEditableTimeChange: (value: Moment) => void;
}

export const RespawnTimeColumn = ({
  boss,
  editableTime,
  updateBossList,
  isRemainingTime,
  handleEditableTimeChange,
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

  const onReduceClick = useCallback(() => {
    const newTime = moment(editableTime || boss.respawnTime).add(-1, 'minute');
    handleEditableTimeChange(newTime);
  }, [boss.respawnTime, editableTime, handleEditableTimeChange]);

  const onIncreaseClick = useCallback(() => {
    const newTime = moment(editableTime || boss.respawnTime).add(1, 'minute');
    handleEditableTimeChange(newTime);
  }, [boss.respawnTime, editableTime, handleEditableTimeChange]);

  const tooltipText = getTooltipText(boss);
  const outputTime = useMemo(
    () => getOutputTime(boss, isRemainingTime, editableTime),
    [boss, isRemainingTime, editableTime]
  );

  return (
    <>
      <Button
        size="small"
        shape="circle"
        onClick={onReduceClick}
        className={styles.reduceButton}
        icon={<MinusOutlined />}
      />

      <Tooltip placement="top" title={tooltipText}>
        <span style={{ position: 'relative' }}>
          {boss.approximately && (
            <span className={styles.approximately}>~</span>
          )}
          {outputTime}
        </span>
      </Tooltip>
      <Button
        size="small"
        shape="circle"
        onClick={onIncreaseClick}
        className={styles.increaseButton}
        icon={<PlusOutlined />}
      />
    </>
  );
};