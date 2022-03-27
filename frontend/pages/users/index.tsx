// global modules
import { useMemo } from 'react';
import { parseCookies } from 'nookies';
import { NextPageContext } from 'next';

// local modules
import { Role, User } from '../../types';
import { getRoles, getUsers } from '../../lib/api';
import { useAuthContext } from '../../contexts/auth-context';
import { UserListTable } from '../../components/user-list-table';
import { NotAllowedBlock } from '../../components/not-allowed-block';

// style modules
import styles from '../../styles/main.module.css';

interface UsersProps {
  users: User[];
  roles: Role[];
}

const Users = ({ users, roles }: UsersProps) => {
  const sortedUsers = useMemo(
    () => users.sort((a, b) => a.nickname.localeCompare(b.nickname)),
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

export async function getServerSideProps(ctx: NextPageContext) {
  let users: User[] = [];
  let roles: Role[] = [];
  const jwt = parseCookies(ctx).jwt;

  try {
    const [allUsers, rolesData] = await Promise.all([
      getUsers(jwt),
      getRoles(jwt),
    ]);
    users = allUsers;
    roles = rolesData;
  } catch (error: any) {}

  return { props: { users, roles } };
}

export default Users;
