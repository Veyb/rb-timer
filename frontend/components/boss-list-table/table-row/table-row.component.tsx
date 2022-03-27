// global modules
import cn from 'classnames';
import moment, { Moment } from 'moment';
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
  const date = moment();
  const diffFromKill = date.diff(moment(boss.time));
  const diffFromSpawn = moment(boss.respawnTime).diff(date);
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
  const [editableTime, setEditableTime] = useState<Moment | null>(null);
  const [calendarDate, setCalendarDate] = useState(null);
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

  const handleDatePickerChange = useCallback((value) => {
    if (!value) setEditableTime(value);
    setCalendarDate(value ? moment(value).seconds(0) : value);
  }, []);

  const handleEditableTimeChange = useCallback((value: Moment) => {
    setEditableTime(value ? moment(value).seconds(0) : value);
  }, []);

  const handleConfirmClick = useCallback(async () => {
    if ((!calendarDate && !editableTime) || !allowedUpdate) return;

    const time = editableTime
      ? moment(editableTime).add(`-${boss.interval}`, 'hours').toISOString()
      : moment(calendarDate).toISOString();

    const updatedBoss = await updateBossTime(
      boss.id,
      { time, approximately: false },
      accessToken
    );
    updateBossInList(updatedBoss);
    setEditableTime(null);
    setCalendarDate(null);
  }, [
    boss.id,
    boss.interval,
    accessToken,
    calendarDate,
    editableTime,
    allowedUpdate,
    updateBossInList,
  ]);

  useEffect(() => {
    if (!editableTime) return () => clearTimeout(timer);

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
