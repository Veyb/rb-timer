'use client';

// global modules
import { useMemo } from 'react';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
// local modules
import type { CommunityMember } from '../../types';
import { AccessPlaceholder } from '../access-placeholder';
import { UserListTable } from '../user-list-table';

interface UsersContentProps {
  users: CommunityMember[];
}

export const UsersContent = ({ users }: UsersContentProps) => {
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.nickname.localeCompare(b.nickname)),
    [users],
  );
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
    <div className={styles.container}>
      <UserListTable users={sortedUsers} />
    </div>
  );
};
