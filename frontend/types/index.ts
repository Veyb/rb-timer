export type { Role, User, UserCollections } from './user.types';
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
