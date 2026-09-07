'use client';

import { useAuthContext } from '../../contexts/auth-context';
import { BossContextProvider } from '../../contexts/boss-context';
// style modules
import styles from '../../styles/main.module.css';
// global modules
import type { Boss } from '../../types';
import { AccessPlaceholder } from '../access-placeholder';
import { BossListTable } from '../boss-list-table';

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

  if (!allowed) return <AccessPlaceholder />;

  return (
    <BossContextProvider bossList={list}>
      <div className={styles.container}>
        <BossListTable />
      </div>
    </BossContextProvider>
  );
};
