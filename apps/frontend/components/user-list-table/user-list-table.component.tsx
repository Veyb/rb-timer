'use client';

// global modules
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useMemo, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import type { CommunityMember } from '../../types';
// local modules
import { Layout } from '../layout';
import { FilterBlock } from './filter-block';

// style modules
import styles from './user-list-table.module.css';

interface UserRowProps {
  user: CommunityMember;
}

const UserRow = ({ user }: UserRowProps) => {
  const router = useRouter();
  const { allowedUpdate } = useAuthContext();

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    if (!allowedUpdate) return;

    router.push(`/users/${user.documentId}`);
  };

  return (
    <tr onClick={handleClick}>
      <td className={styles.nickname}>{user.nickname}</td>
      <td className={styles.column}>{user.realname}</td>
      <td className={cn(styles.column, styles.role)}>{user.role.name}</td>
    </tr>
  );
};

interface UserListTableProps {
  users: CommunityMember[];
}

export const UserListTable = ({ users }: UserListTableProps) => {
  const { allowedUpdate } = useAuthContext();
  const [searchValue, setSearchValue] = useState('');
  const [filteredRoles, setFilteredRoles] = useState<string | undefined>(undefined);

  /**
   * Derived from the members on screen rather than fetched. The filter narrows
   * this list, so its choices are the roles this list contains — which also
   * means a role an officer cannot assign is still one they can filter by.
   */
  const roles = useMemo(() => {
    const byType = new Map(users.map((user) => [user.role.type, user.role]));

    return [...byType.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const renderedUsers = useMemo(
    () =>
      users
        .filter((user) => !filteredRoles || filteredRoles === user.role.name)
        .filter((user) => user.nickname.toLowerCase().includes(searchValue.toLowerCase())),
    [users, searchValue, filteredRoles],
  );

  return (
    <Layout className={styles.layout}>
      <FilterBlock roles={roles} handleSearch={setSearchValue} handleFilter={setFilteredRoles} />

      <table className={styles.table} data-testid={TEST_IDS.usersList.table}>
        <thead className={styles.tableThead}>
          <tr>
            <th className={styles.nickname}>Никнейм</th>
            <th className={styles.column}>Имя</th>
            <th className={cn(styles.column, styles.role)}>Роль</th>
          </tr>
        </thead>
        {renderedUsers.length ? (
          <tbody
            className={cn(styles.tableTbody, {
              [styles.interactive]: allowedUpdate,
            })}
          >
            {renderedUsers.map((user) => (
              <UserRow key={user.documentId} user={user} />
            ))}
          </tbody>
        ) : (
          <p className={styles.empty}>Пользователи не найдены</p>
        )}
      </table>
    </Layout>
  );
};
