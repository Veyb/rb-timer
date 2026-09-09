// global modules
import { notFound } from 'next/navigation';
import { ProfileContent } from '../../../components/profile-content';
import { getMemberRoles } from '../../../lib/api';
// local modules
import { getSessionToken } from '../../../lib/dal';
import type { Role } from '../../../types';

export default async function ProfileTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (type !== 'management' && type !== 'collections') {
    notFound();
  }

  const jwt = await getSessionToken();

  let roles: Role[] = [];
  if (jwt) {
    try {
      roles = await getMemberRoles(jwt);
    } catch {}
  }

  return <ProfileContent type={type} roles={roles} />;
}
