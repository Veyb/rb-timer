// global modules
import { Button } from 'antd';
import { useCallback, useState } from 'react';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';

// local modules
import { Boss } from '../../types';
import { TableRow } from './table-row';

// style modules
import styles from './boss-list-table.module.css';

interface RespawnColumnHeaderProps {
  onClick: () => void;
  isRemainingTime: boolean;
}

const RespawnColumnHeader = ({
  onClick,
  isRemainingTime,
}: RespawnColumnHeaderProps) => {
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
    <table className={styles.table}>
      <thead className={styles.tableThead}>
        <tr>
          <th className={styles.nameColumn}>Имя</th>
          <th className={styles.respawnColumn}>
            <RespawnColumnHeader
              onClick={handleTimeClick}
              isRemainingTime={isRemainingTime}
            />
          </th>
          <th className={styles.actionsColumn}>Действия</th>
        </tr>
      </thead>
      <tbody className={styles.tableTbody}>
        {bossList.map((boss) => (
          <TableRow
            key={boss.id}
            boss={boss}
            isRemainingTime={isRemainingTime}
            updateBossList={updateBossList}
          />
        ))}
      </tbody>
    </table>
  );
};
