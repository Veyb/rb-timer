import type { Community } from './community.types';
import type { Role } from './role.types';

export type UserCollections = Record<number, Record<number, boolean>>;

export interface User {
  /**
   * Strapi 5 names documents by `documentId`, and so does every endpoint in
   * this app. The numeric key the database uses is not part of any contract.
   */
  documentId: string;
  username: string;
  email: string;
  nickname: string;
  realname: string;
  collections: UserCollections;
  role: Role;
  /**
   * Null until an operator assigns one or an invite code is redeemed. Only
   * `/users/me` carries it; a user never reads anyone else's community.
   */
  community: Community | null;
  createdAt: string;
  updatedAt: string;
}

export type SocketUser = Pick<User, 'documentId' | 'nickname'>;
