// global modules
import { notFound, redirect } from 'next/navigation';
import { UserProfileContent } from '../../../../components/user-profile-content';
import { getCommunityMember, getMemberRoles, loadOrEmpty } from '../../../../lib/api';
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

  // A member outside the caller's community answers as not found, and so does
  // a caller the gate refuses — both are `notFound()` rather than a fault, and
  // the placeholder below explains the second. Anything else reaches
  // `app/error.tsx`.
  const [user, roles] = await Promise.all([
    loadOrEmpty<CommunityMember | null>(
      () => getCommunityMember(userId, jwt),
      null,
      [401, 403, 404],
    ),
    loadOrEmpty<Role[]>(() => getMemberRoles(jwt), []),
  ]);

  if (!user) {
    notFound();
  }

  return <UserProfileContent type={type} user={user} roles={roles} />;
}
