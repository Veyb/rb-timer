// global modules
import { useMemo } from 'react';
import { parseCookies } from 'nookies';
import { NextPageContext } from 'next';

// local modules
import { User } from '../../types';
import { getUsers } from '../../lib/api';
import { useAuthContext } from '../../contexts/auth-context';
import { UserListTable } from '../../components/user-list-table';

// style modules
import styles from '../../styles/main.module.css';

interface UsersProps {
  users: User[];
}

const Users = ({ users }: UsersProps) => {
  const authorizedUsers = useMemo(
    () =>
      users
        .filter(
          (user) => user.role.type === 'editor' || user.role.type === 'viewer'
        )
        .sort((a, b) => a.nickname.localeCompare(b.nickname)),
    [users]
  );
  const { loggedIn, allowedUpdate } = useAuthContext();

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowedUpdate)
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Доступ ограничен</h2>
        <div>за доступом обратитесь к Тэя</div>
      </div>
    );

  return (
    <div className={styles.container}>
      <UserListTable users={authorizedUsers} />
    </div>
  );
};

export async function getServerSideProps(ctx: NextPageContext) {
  let users: User[] = [];
  const jwt = parseCookies(ctx).jwt;

  try {
    const allUsers = await getUsers(jwt);
    users = allUsers;
  } catch (error: any) {}

  return { props: { users } };
}

export default Users;
