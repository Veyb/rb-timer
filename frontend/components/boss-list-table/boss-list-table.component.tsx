import { Button, Space, Table } from 'antd';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';

import { Boss } from '../../types';
import { NameColumn } from './name-column.component';
import { ActionsColumn } from './actions-column.component';
import { RespawnTimeColumn } from './respawn-time-column.component';

import styles from './boss-list-table.module.css';
import { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { MINUTE } from '../../constants';

interface TimeHeaderProps {
  onClick: () => void;
  isRemainingTime: boolean;
}

const TimeHeader = ({ onClick, isRemainingTime }: TimeHeaderProps) => {
  return (
    <>
      {isRemainingTime ? 'Время до' : 'Время'}
      <Button
        size="small"
        shape="circle"
        onClick={onClick}
        className={styles.remainingButton}
        icon={isRemainingTime ? <RedoOutlined /> : <UndoOutlined />}
      />
    </>
  );
};

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

interface BossListTableProps {
  bossList: Boss[];
  updateBossList: (boss: Boss) => void;
}

export const BossListTable = ({
  bossList,
  updateBossList,
}: BossListTableProps) => {
  const [isRemainingTime, setRemainingTime] = useState(false);
  const handleTimeClick = useCallback(() => {
    setRemainingTime(!isRemainingTime);
  }, [isRemainingTime, setRemainingTime]);

  return (
    <Table
      pagination={false}
      className={styles.table}
      dataSource={bossList.map((boss) => ({ ...boss, key: boss.id }))}
      rowClassName={(record) => (isAnimated(record) ? styles.rowAnimation : '')}
    >
      <Table.Column
        key="name"
        dataIndex="name"
        title="Имя"
        align="left"
        render={(name: string, record: Boss) => <NameColumn boss={record} />}
      />
      <Table.Column
        key="respawnTime"
        dataIndex="respawnTime"
        title={
          <TimeHeader
            onClick={handleTimeClick}
            isRemainingTime={isRemainingTime}
          />
        }
        align="center"
        className={styles.respawnColumn}
        render={(respawnTime: string, record: Boss) => (
          <RespawnTimeColumn
            boss={record}
            updateBossList={updateBossList}
            isRemainingTime={isRemainingTime}
          />
        )}
      />
      <Table.Column
        key="actions"
        title="Действия"
        align="center"
        className={styles.actionsColumn}
        render={(text, record: Boss) => (
          <ActionsColumn boss={record} updateBossList={updateBossList} />
        )}
      />
    </Table>
  );
};
