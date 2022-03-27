import { Role } from './role.types';

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
  createdAt: string;
  updatedAt: string;
}
