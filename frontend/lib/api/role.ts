// local modules
import { get } from './base';
import { Role } from '../../types';

export async function getRoles(token: string | undefined) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const { roles } = await get(`/users-permissions/roles`, params);
  return (roles as Role[]).filter(({ type }) => type !== 'public');
}
