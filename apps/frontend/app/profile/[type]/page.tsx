// global modules
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

// local modules
import type { Role } from '../../../types';
import { getRoles } from '../../../lib/api';
import { ProfileContent } from '../../../components/profile-content';

export default async function ProfileTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  if (type !== 'management' && type !== 'collections') {
    notFound();
  }

  const jwt = (await cookies()).get('jwt')?.value;

  let roles: Role[] = [];
  if (jwt) {
    try {
      roles = await getRoles(jwt);
    } catch (err: any) {}
  }

  return <ProfileContent type={type} roles={roles} />;
}
