// global modules
import { cookies } from 'next/headers';
import { UsersContent } from '../../components/users-content';
import { getCommunityMembers, getRoles } from '../../lib/api';
// local modules
import type { CommunityMember, Role } from '../../types';

export default async function UsersPage() {
  const jwt = (await cookies()).get('jwt')?.value;

  let users: CommunityMember[] = [];
  let roles: Role[] = [];
  try {
    const [allUsers, rolesData] = await Promise.all([getCommunityMembers(jwt), getRoles(jwt)]);
    users = allUsers;
    roles = rolesData;
  } catch {}

  return <UsersContent users={users} roles={roles} />;
}
