export type Quality = 'none' | 'blue' | 'red' | 'purple';

export interface BossApiResponse {
  id: number;
  name: string;
  quality: Quality;
  interval: number;
  chance: number;
  time: string;
  approximately: boolean;
  alliance: boolean;
  world: boolean;
}

export interface Boss extends BossApiResponse {
  respawnTime: number;
}

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
