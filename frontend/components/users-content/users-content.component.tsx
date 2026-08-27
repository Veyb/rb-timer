'use client';

// global modules
import { useMemo } from 'react';

// local modules
import type { Role, User } from '../../types';
import { useAuthContext } from '../../contexts/auth-context';
import { UserListTable } from '../user-list-table';
import { NotAllowedBlock } from '../not-allowed-block';

// style modules
import styles from '../../styles/main.module.css';

interface UsersContentProps {
  users: User[];
  roles: Role[];
}

export const UsersContent = ({ users, roles }: UsersContentProps) => {
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.nickname.localeCompare(b.nickname)),
    [users]
  );
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
    <div className={styles.container}>
      <UserListTable users={sortedUsers} roles={roles} />
    </div>
  );
};
