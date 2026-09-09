// local modules

import type { Role } from '../../types';
import { apiGet, authHeaders } from './base';

/**
 * The roles an officer may assign, as a name and a type.
 *
 * Not the plugin's `/users-permissions/roles`, which this used to call: that
 * one answers with `nb_users` — how many accounts hold each role across every
 * community in the installation — and, for a single role, its whole permission
 * map. The screen wants a label and a value, so that is what the endpoint gives.
 */
export async function getMemberRoles(token: string | undefined) {
  return apiGet<Role[]>('/community/member-roles', authHeaders(token));
}
