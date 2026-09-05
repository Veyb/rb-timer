'use client';

// global modules
import type { Boss } from '../../types';
import { useAuthContext } from '../../contexts/auth-context';
import { BossListTable } from '../boss-list-table';
import { BossContextProvider } from '../../contexts/boss-context';
import { NotAllowedBlock } from '../not-allowed-block';

// style modules
import styles from '../../styles/main.module.css';

interface HomeContentProps {
  list: Boss[];
}

export const HomeContent = ({ list }: HomeContentProps) => {
  const { loggedIn, allowed } = useAuthContext();

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowed) return <NotAllowedBlock />;

  return (
    <BossContextProvider bossList={list}>
      <div className={styles.container}>
        <BossListTable />
      </div>
    </BossContextProvider>
  );
};
