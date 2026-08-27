// global modules
import cn from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

// local modules
import { Boss } from '../../../types';
import { MINUTE } from '../../../constants';
import { updateBossTime } from '../../../lib/api';
import { useBossContext } from '../../../contexts/boss-context';
import { useAuthContext } from '../../../contexts/auth-context';
import { ActionsColumn, NameColumn, RespawnTimeColumn } from './columns';

// style modules
import styles from '../boss-list-table.module.css';

const THIRTY_SECONDS = 30 * 1000;

function isAnimated(boss: Boss) {
  const date = dayjs();
  const diffFromKill = date.diff(dayjs(boss.time));
  const diffFromSpawn = dayjs(boss.respawnTime).diff(date);
  const getDiffMinutes = (diff: number) => Math.floor(diff / MINUTE);

  return (
    (!boss.world &&
      (getDiffMinutes(diffFromKill) <= 5 ||
        getDiffMinutes(diffFromSpawn) <= 5)) ||
    (boss.world && getDiffMinutes(diffFromSpawn) <= 5)
  );
}

interface RowProps {
  boss: Boss;
  isRemainingTime: boolean;
}

export const TableRow = ({ boss, isRemainingTime }: RowProps) => {
  const { accessToken, allowedUpdate } = useAuthContext();
  const { updateBossInList } = useBossContext();
  const [editableTime, setEditableTime] = useState<Dayjs | null>(null);
  const [calendarDate, setCalendarDate] = useState<Dayjs | null>(null);
  const className = useMemo(
    () =>
      isAnimated(boss)
        ? cn(
            styles.row,
            styles.rowAnimation,
            !!editableTime && styles.editableTime
          )
        : cn(styles.row, !!editableTime && styles.editableTime),
    [boss, editableTime]
  );

  const handleDatePickerChange = useCallback((value: Dayjs | null) => {
    if (!value) setEditableTime(value);
    setCalendarDate(value ? value.second(0) : value);
  }, []);

  const handleEditableTimeChange = useCallback((value: Dayjs) => {
    setEditableTime(value ? value.second(0) : value);
  }, []);

  const handleConfirmClick = useCallback(async () => {
    if ((!calendarDate && !editableTime) || !allowedUpdate) return;

    const time = editableTime
      ? editableTime.add(-boss.interval, 'hour').toISOString()
      : dayjs(calendarDate).toISOString();

    const updatedBoss = await updateBossTime(
      boss.documentId,
      { time, approximately: false },
      accessToken
    );
    updateBossInList(updatedBoss);
    setEditableTime(null);
    setCalendarDate(null);
  }, [
    boss.documentId,
    boss.interval,
    accessToken,
    calendarDate,
    editableTime,
    allowedUpdate,
    updateBossInList,
  ]);

  useEffect(() => {
    if (!editableTime) return;

    const timer = setTimeout(() => {
      handleDatePickerChange(null);
    }, THIRTY_SECONDS);

    return () => clearTimeout(timer);
  }, [editableTime, handleDatePickerChange]);

  return (
    <tr className={className}>
      <td className={styles.nameColumn}>
        <NameColumn boss={boss} />
      </td>
      <td className={styles.respawnColumn}>
        <RespawnTimeColumn
          boss={boss}
          editableTime={editableTime}
          isRemainingTime={isRemainingTime}
          handleEditableTimeChange={handleEditableTimeChange}
        />
      </td>
      <td className={styles.actionsColumn}>
        <ActionsColumn
          boss={boss}
          editableTime={editableTime}
          calendarDate={calendarDate}
          handleConfirmClick={handleConfirmClick}
          handleDatePickerChange={handleDatePickerChange}
        />
      </td>
    </tr>
  );
};
