// local modules
import { apiGet } from './base';
import { type Role } from '../../types';

export async function getRoles(token: string | undefined) {
  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const { roles } = await apiGet(`/users-permissions/roles`, params);
  return (roles as Role[]).filter(({ type }) => type !== 'public');
}
