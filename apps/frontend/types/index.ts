export type { Boss, BossApiResponse, Quality } from './boss.types';
export type { Community, CommunityLogo, GameServer } from './community.types';
export type { CommunityMember } from './community-member.types';
export type { Donation } from './donation.types';
export type {
  InviteCode,
  InviteHistoryEntry,
  InviteParty,
  InviteRedemption,
  NewInviteCode,
  RedeemedInvite,
} from './invite-code.types';
export type {
  Avatar,
  BossDrop,
  BossStats,
  CatalogImage,
  CatalogItem,
  Dungeon,
  Element,
  Grade,
  Location,
  Maps,
  ModifierUnit,
  RaidBoss,
  Respawn,
  RespawnEntry,
  Skill,
  Weapon,
  Weekday,
} from './raid-boss.types';
export { WEAPON_LABELS } from './raid-boss.types';
export type { Role, RoleType } from './role.types';
export type { MayHaveTestId } from './test-id.types';
export type { SocketUser, User } from './user.types';

export interface Meta {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}
