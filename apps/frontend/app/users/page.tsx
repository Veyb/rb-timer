// global modules
import { cookies } from 'next/headers';
import { UsersContent } from '../../components/users-content';
import { getRoles, getUsers } from '../../lib/api';
// local modules
import type { Role, User } from '../../types';

export default async function UsersPage() {
  const jwt = (await cookies()).get('jwt')?.value;

  let users: User[] = [];
  let roles: Role[] = [];
  try {
    const [allUsers, rolesData] = await Promise.all([getUsers(jwt), getRoles(jwt)]);
    users = allUsers;
    roles = rolesData;
  } catch {}

  return <UsersContent users={users} roles={roles} />;
}
