export interface Role {
  id: number;
  name: string;
  description: string;
  type: 'authenticated' | 'viewer' | 'editor';
}

export type UserCollections = Record<number, Record<number, boolean>>;

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
  realname: string;
  collections: UserCollections;
  role: Role;
}
