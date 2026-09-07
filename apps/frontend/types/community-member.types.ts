import type { UserRole } from './user.types';

/**
 * Another member of the caller's own community, as `/community/members`
 * returns them.
 *
 * Narrower than `User` on purpose. The endpoint answers with an allowlist, so
 * there is no `email` here, and no `collections` or `community` either — one
 * member's e-mail address, item collection and membership are not another
 * member's business, and the old `/users` endpoint handed all of them out.
 */
export interface CommunityMember {
  id: number;
  documentId: string;
  username: string;
  nickname: string;
  realname: string;
  createdAt: string;
  role: UserRole;
}
