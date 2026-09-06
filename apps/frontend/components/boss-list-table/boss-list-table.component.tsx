'use client';

// global modules
// import { Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useCallback, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { useBossContext } from '../../contexts/boss-context';
import { Button } from '../../styled-components';
// local modules
import { Layout } from '../layout';
// style modules
import styles from './boss-list-table.module.css';
import { RestartModal } from './restart-modal';
import { TableRow } from './table-row';

interface RespawnColumnHeaderProps {
  onClick: () => void;
  isRemainingTime: boolean;
}

const RespawnColumnHeader = ({ onClick, isRemainingTime }: RespawnColumnHeaderProps) => {
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
  const { bossList } = useBossContext();
  const { allowedUpdate } = useAuthContext();
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
  }, [isRemainingTime]);

  return (
    <>
      <Layout>
        <table className={styles.table} data-testid={TEST_IDS.bossList.table}>
          <thead className={styles.tableThead}>
            <tr>
              <th className={styles.nameColumn}>Имя</th>
              <th className={styles.respawnColumn}>
                <RespawnColumnHeader onClick={handleTimeClick} isRemainingTime={isRemainingTime} />
              </th>
              <th className={styles.actionsColumn}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tableTbody}>
            {bossList.map((boss) => (
              <TableRow key={boss.documentId} boss={boss} isRemainingTime={isRemainingTime} />
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
