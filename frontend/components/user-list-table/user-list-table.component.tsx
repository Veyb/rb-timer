// global modules
import { MouseEvent } from 'react';
import { useRouter } from 'next/router';

// local modules
import { User } from '../../types';
import { Layout } from '../layout';

// style modules
import styles from './user-list-table.module.css';

interface UserRowProps {
  user: User;
}

const UserRow = ({ user }: UserRowProps) => {
  const router = useRouter();
  const collectionsValues = Object.values(user.collections || {});
  const checkedCollectionsCount = collectionsValues.filter((collection) =>
    Object.values(collection).every(Boolean)
  ).length;

  const collectionsStatus = collectionsValues.length
    ? `${checkedCollectionsCount}/${collectionsValues.length}`
    : 'Не заполнено';

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    router.push(`/users/${user.id}`);
  };

  return (
    <tr onClick={handleClick}>
      <td className={styles.nickname}>{user.nickname}</td>
      <td className={styles.column}>{user.realname}</td>
      <td className={styles.column}>{user.role.name}</td>
      <td className={styles.column}>{collectionsStatus}</td>
    </tr>
  );
};

interface UserListTableProps {
  users: User[];
}

export const UserListTable = ({ users }: UserListTableProps) => {
  return (
    <Layout>
      <table className={styles.table}>
        <thead className={styles.tableThead}>
          <tr>
            <th className={styles.nickname}>Никнейм</th>
            <th className={styles.column}>Имя</th>
            <th className={styles.column}>Роль</th>
            <th className={styles.column}>Статус коллекций</th>
          </tr>
        </thead>
        <tbody className={styles.tableTbody}>
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </Layout>
  );
};
