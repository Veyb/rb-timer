import type { Community } from './community.types';
import type { Role } from './role.types';

export type UserCollections = Record<number, Record<number, boolean>>;

export type UserRole = Omit<Role, 'nb_users'>;

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  realname: string;
  collections: UserCollections;
  role: UserRole;
  /**
   * Null until an operator assigns one or an invite code is redeemed. Only
   * `/users/me` carries it; a user never reads anyone else's community.
   */
  community: Community | null;
  createdAt: string;
  updatedAt: string;
}

export type SocketUser = Pick<User, 'id' | 'nickname'>;
