export type RoleType =
  | 'authenticated'
  | 'public'
  | 'viewer'
  | 'editor'
  | 'officer';

export interface Role {
  id: number;
  name: string;
  description: string;
  type: RoleType;
  nb_users: number;
}
