// global modules
import { notFound, redirect } from 'next/navigation';
import { UserProfileContent } from '../../../../components/user-profile-content';
import { getCommunityMember, getMemberRoles } from '../../../../lib/api';
import { getCurrentUser } from '../../../../lib/dal';
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

  const { user: viewer, jwt } = await getCurrentUser();

  // Your own account already has a page, and it is the one that offers leaving
  // and deletion. This one is built for looking at somebody else: its heading
  // names them, and its controls are an officer's over another member. Reached
  // from the member list or typed by hand, your own document belongs there.
  if (viewer?.documentId === userId) {
    redirect('/profile/management');
  }

  let user: CommunityMember | null = null;
  let roles: Role[] = [];
  if (jwt) {
    try {
      const [userData, rolesData] = await Promise.all([
        getCommunityMember(userId, jwt),
        getMemberRoles(jwt),
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
