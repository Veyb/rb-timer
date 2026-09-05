// global modules
import { cookies } from 'next/headers';

// local modules
import type { Role, User } from '../../types';
import { getRoles, getUsers } from '../../lib/api';
import { UsersContent } from '../../components/users-content';

export default async function UsersPage() {
  const jwt = (await cookies()).get('jwt')?.value;

  let users: User[] = [];
  let roles: Role[] = [];
  try {
    const [allUsers, rolesData] = await Promise.all([
      getUsers(jwt),
      getRoles(jwt),
    ]);
    users = allUsers;
    roles = rolesData;
  } catch (error: any) {}

  return <UsersContent users={users} roles={roles} />;
}
