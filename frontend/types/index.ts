export type { Role, RoleType } from './role.types';
export type { SocketUser, User, UserRole, UserCollections } from './user.types';
export type { Boss, BossApiResponse, Quality } from './boss.types';
export type {
  Rank,
  ItemType,
  ImageType,
  FilterType,
  Item,
  Effect,
  Collection,
  CollectionItem,
} from './collection.types';

export interface Meta {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}
