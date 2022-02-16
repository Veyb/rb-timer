// global modules
import { Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useCallback, useState } from 'react';

// local modules
import { Layout } from '../layout';
import { TableRow } from './table-row';
import { RestartModal } from './restart-modal';
import { useBossContext } from '../../contexts/boss-context';
import { useAuthContext } from '../../contexts/auth-context';

// style modules
import styles from './boss-list-table.module.css';
import mainStyles from '../../styles/main.module.css';

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
        icon={<SwapOutlined />}
      />
    </>
  );
};

export const BossListTable = () => {
  const { loggedIn, allowed, allowedUpdate } = useAuthContext();
  const { bossList } = useBossContext();
  const [isRemainingTime, setRemainingTime] = useState(false);

  const [modal, setModal] = useState(false);
  const handleModalClick = useCallback(() => {
    setModal(true);
  }, []);
  const handleModalClose = useCallback(() => {
    setModal(false);
  }, []);

  const handleTimeClick = useCallback(() => {
    setRemainingTime(!isRemainingTime);
  }, [isRemainingTime, setRemainingTime]);

  if (!loggedIn) {
    return (
      <div className={mainStyles.infoHolder}>
        <h2 className={mainStyles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  return !allowed ? (
    <div className={mainStyles.infoHolder}>
      <h2 className={mainStyles.infoMessage}>Доступ ограничен</h2>
      <div>за доступом обратитесь к Тэя</div>
    </div>
  ) : (
    <>
      <Layout>
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
        {allowedUpdate && (
          <Button className={styles.resetButton} onClick={handleModalClick}>
            РЕСТАРТ
          </Button>
        )}
      </Layout>

      <RestartModal visible={modal} onClose={handleModalClose} />
    </>
  );
};
