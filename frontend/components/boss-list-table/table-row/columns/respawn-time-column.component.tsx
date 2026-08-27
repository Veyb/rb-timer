// global modules
import dayjs, { Dayjs } from 'dayjs';
import { Tooltip } from 'antd';
import { useCallback, useEffect, useMemo } from 'react';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../../../types';
import { getNewRespawnTime } from './utils';
import { HOUR, MINUTE } from '../../../../constants';
import { updateBossTime } from '../../../../lib/api';
import { Button } from '../../../../styled-components';
import { useBossContext } from '../../../../contexts/boss-context';
import { useAuthContext } from '../../../../contexts/auth-context';

// style modules
import styles from '../../boss-list-table.module.css';

function getTooltipText(boss: Boss) {
  const timeOfDeath = dayjs(boss.time);
  const hoursOfDeath = timeOfDeath.hour().toString().padStart(2, '0');
  const minutesOfDeath = timeOfDeath.minute().toString().padStart(2, '0');

  return `Время фарма ${hoursOfDeath}:${minutesOfDeath}`;
}

function getOutputTime(
  boss: Boss,
  isRemainingTime: boolean,
  editableTime: Dayjs | null
) {
  const date = dayjs(editableTime || boss.respawnTime);
  const hours = date.hour().toString().padStart(2, '0');
  const minutes = date.minute().toString().padStart(2, '0');

  const diff = date.diff(dayjs());
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

interface RespawnTimeColumnProps {
  boss: Boss;
  editableTime: Dayjs | null;
  isRemainingTime: boolean;
  handleEditableTimeChange: (value: Dayjs) => void;
}

export const RespawnTimeColumn = ({
  boss,
  editableTime,
  isRemainingTime,
  handleEditableTimeChange,
}: RespawnTimeColumnProps) => {
  const { accessToken, allowedUpdate } = useAuthContext();
  const { updateBossInList } = useBossContext();

  useEffect(() => {
    if (!allowedUpdate || boss.restarted) return;
    const currentDateTime = dayjs().valueOf();
    const shouldUpdateWorld = boss.world && currentDateTime > boss.respawnTime;
    const bossNotRespawned =
      !boss.world &&
      currentDateTime > dayjs(boss.respawnTime).add(20, 'minute').valueOf();

    if (shouldUpdateWorld) {
      const time = getNewRespawnTime(boss.respawnTime, boss.interval);
      updateBossTime(boss.id, { time }, accessToken).then((newBossApiInfo) =>
        updateBossInList(newBossApiInfo, true)
      );
    }

    if (bossNotRespawned) {
      const time = getNewRespawnTime(boss.respawnTime, boss.interval);
      updateBossTime(boss.id, { time, approximately: true }, accessToken).then(
        (newBossApiInfo) => updateBossInList(newBossApiInfo, true)
      );
    }
  }, [boss, allowedUpdate, updateBossInList, accessToken]);

  const onReduceClick = useCallback(() => {
    const newTime = dayjs(editableTime || boss.respawnTime).add(-1, 'minute');
    handleEditableTimeChange(newTime);
  }, [boss.respawnTime, editableTime, handleEditableTimeChange]);

  const onIncreaseClick = useCallback(() => {
    const newTime = dayjs(editableTime || boss.respawnTime).add(1, 'minute');
    handleEditableTimeChange(newTime);
  }, [boss.respawnTime, editableTime, handleEditableTimeChange]);

  const tooltipText = getTooltipText(boss);
  const outputTime = useMemo(
    () => getOutputTime(boss, isRemainingTime, editableTime),
    [boss, isRemainingTime, editableTime]
  );

  return (
    <>
      {boss.world || !allowedUpdate ? null : (
        <Button
          size="small"
          shape="circle"
          onClick={onReduceClick}
          className={styles.reduceButton}
          icon={<MinusOutlined />}
        />
      )}

      <Tooltip placement="top" title={tooltipText}>
        <span style={{ position: 'relative' }}>
          {boss.approximately && (
            <span className={styles.approximately}>~</span>
          )}
          {outputTime}
        </span>
      </Tooltip>

      {boss.world || !allowedUpdate ? null : (
        <Button
          size="small"
          shape="circle"
          onClick={onIncreaseClick}
          className={styles.increaseButton}
          icon={<PlusOutlined />}
        />
      )}
    </>
  );
};
