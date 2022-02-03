// global modules
import { Button } from 'antd';
import { useCallback, useState } from 'react';
import { RedoOutlined, UndoOutlined } from '@ant-design/icons';

// local modules
import { TableRow } from './table-row';
import { useBossContext } from '../../contexts/boss-context';
import { useAuthContext } from '../../contexts/auth-context';

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

export const BossListTable = () => {
  const { loggedIn } = useAuthContext();
  const { bossList, allowed } = useBossContext();
  const [isRemainingTime, setRemainingTime] = useState(false);

  const handleTimeClick = useCallback(() => {
    setRemainingTime(!isRemainingTime);
  }, [isRemainingTime, setRemainingTime]);

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  return !allowed ? (
    <div className={styles.infoHolder}>
      <h2 className={styles.infoMessage}>Доступ ограничен</h2>
    </div>
  ) : (
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
          />
        ))}
      </tbody>
    </table>
  );
};
