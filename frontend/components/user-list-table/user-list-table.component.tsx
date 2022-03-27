// global modules
import cn from 'classnames';
import { useRouter } from 'next/router';
import { MouseEvent, useMemo, useState } from 'react';

// local modules
import { Layout } from '../layout';
import { FilterBlock } from './filter-block';
import { useAuthContext } from '../../contexts/auth-context';
import { Role, User } from '../../types';

// style modules
import styles from './user-list-table.module.css';

interface UserRowProps {
  user: User;
}

const UserRow = ({ user }: UserRowProps) => {
  const router = useRouter();
  const { allowedUpdate } = useAuthContext();
  const collectionsValues = Object.values(user.collections || {});
  const checkedCollectionsCount = collectionsValues.filter((collection) =>
    Object.values(collection).every(Boolean)
  ).length;

  const collectionsStatus = collectionsValues.length
    ? `${checkedCollectionsCount}/${collectionsValues.length}`
    : 'Не заполнено';

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    if (!allowedUpdate) return;

    router.push(`/users/${user.id}`);
  };

  return (
    <tr onClick={handleClick}>
      <td className={styles.nickname}>{user.nickname}</td>
      <td className={styles.column}>{user.realname}</td>
      <td className={cn(styles.column, styles.role)}>{user.role.name}</td>
      <td className={styles.column}>{collectionsStatus}</td>
    </tr>
  );
};

interface UserListTableProps {
  users: User[];
  roles: Role[];
}

export const UserListTable = ({ users, roles }: UserListTableProps) => {
  const { allowedUpdate } = useAuthContext();
  const [searchValue, setSearchValue] = useState('');
  const [filteredRoles, setFilteredRoles] = useState(undefined);

  const renderedUsers = useMemo(
    () =>
      users
        .filter((user) => !filteredRoles || filteredRoles === user.role.name)
        .filter((user) =>
          user.nickname.toLowerCase().includes(searchValue.toLowerCase())
        ),
    [users, searchValue, filteredRoles]
  );

  return (
    <Layout className={styles.layout}>
      <FilterBlock
        roles={roles}
        handleSearch={setSearchValue}
        handleFilter={setFilteredRoles}
      />

      <table className={styles.table}>
        <thead className={styles.tableThead}>
          <tr>
            <th className={styles.nickname}>Никнейм</th>
            <th className={styles.column}>Имя</th>
            <th className={cn(styles.column, styles.role)}>Роль</th>
            <th className={styles.column}>Статус коллекций</th>
          </tr>
        </thead>
        {renderedUsers.length ? (
          <tbody
            className={cn(styles.tableTbody, {
              [styles.interactive]: allowedUpdate,
            })}
          >
            {renderedUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </tbody>
        ) : (
          <p className={styles.empty}>Пользователи не найдены</p>
        )}
      </table>
    </Layout>
  );
};
