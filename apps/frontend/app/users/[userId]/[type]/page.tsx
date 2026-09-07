// global modules
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { UserProfileContent } from '../../../../components/user-profile-content';
import { getCommunityMember, getRoles } from '../../../../lib/api';
// local modules
import type { CommunityMember, Role } from '../../../../types';

export default async function UserProfileTypePage({
  params,
}: {
  params: Promise<{ userId: string; type: string }>;
}) {
  const { userId, type } = await params;

  // Another member's item collection is per-user data the member endpoint
  // deliberately does not return, so this route can no longer serve it. Your
  // own /profile/collections is unaffected.
  if (type !== 'management') {
    notFound();
  }

  const jwt = (await cookies()).get('jwt')?.value;

  let user: CommunityMember | null = null;
  let roles: Role[] = [];
  if (jwt) {
    try {
      const [userData, rolesData] = await Promise.all([
        getCommunityMember(userId, jwt),
        getRoles(jwt),
      ]);
      user = userData;
      roles = rolesData;
    } catch {}
  }

  if (!user) {
    notFound();
  }

  return <UserProfileContent type={type} user={user} roles={roles} />;
}
