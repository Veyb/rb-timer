export type { Boss, BossApiResponse, Quality } from './boss.types';
export type {
  Collection,
  CollectionItem,
  Effect,
  FilterType,
  ImageType,
  Item,
  ItemType,
  Rank,
} from './collection.types';
export type { Donation } from './donation.types';
export type { Role, RoleType } from './role.types';
export type { MayHaveTestId } from './test-id.types';
export type { SocketUser, User, UserCollections, UserRole } from './user.types';

export interface Meta {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}
