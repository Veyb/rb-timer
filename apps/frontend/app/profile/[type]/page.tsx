// global modules
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProfileContent } from '../../../components/profile-content';
import { getRoles } from '../../../lib/api';
// local modules
import type { Role } from '../../../types';

export default async function ProfileTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (type !== 'management' && type !== 'collections') {
    notFound();
  }

  const jwt = (await cookies()).get('jwt')?.value;

  let roles: Role[] = [];
  if (jwt) {
    try {
      roles = await getRoles(jwt);
    } catch {}
  }

  return <ProfileContent type={type} roles={roles} />;
}
