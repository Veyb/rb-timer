// global modules
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { UserProfileContent } from '../../../../components/user-profile-content';
import { getRoles, getUser } from '../../../../lib/api';
// local modules
import type { Role, User } from '../../../../types';

export default async function UserProfileTypePage({
  params,
}: {
  params: Promise<{ userId: string; type: string }>;
}) {
  const { userId, type } = await params;

  if (type !== 'management' && type !== 'collections') {
    notFound();
  }

  const jwt = (await cookies()).get('jwt')?.value;

  let user: User | null = null;
  let roles: Role[] = [];
  if (jwt) {
    try {
      const [userData, rolesData] = await Promise.all([getUser(userId, jwt), getRoles(jwt)]);
      user = userData;
      roles = rolesData;
    } catch {}
  }

  if (!user) {
    notFound();
  }

  return <UserProfileContent type={type} user={user} roles={roles} />;
}
