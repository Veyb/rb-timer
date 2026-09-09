import type { GameServer } from './community.types';

/**
 * A member as an invite code names them. Narrower than `CommunityMember`
 * because the invite endpoints answer with their own allowlist — an officer
 * reviewing a code needs to recognise who was let in, and nothing more.
 */
export interface InviteParty {
  documentId: string;
  nickname: string;
}

/** One successful use of a code. */
export interface InviteRedemption {
  documentId: string;
  redeemedAt: string;
  user: InviteParty | null;
}

/**
 * An invite code as `/invite-codes` returns it to an officer of the community
 * it belongs to. Codes of any other community never appear: the endpoint scopes
 * every answer to the caller's own membership.
 */
export interface InviteCode {
  documentId: string;
  code: string;
  /** Null means unlimited. */
  maxUses: number | null;
  usedCount: number;
  /** Null whenever `maxUses` is — there is no ceiling to count down from. */
  remainingUses: number | null;
  /** Null means it never expires. */
  expiresAt: string | null;
  /** Set once an officer has revoked the code; the row is kept either way. */
  revokedAt: string | null;
  createdAt: string;
  issuedBy: InviteParty | null;
  redemptions: InviteRedemption[];
}

/**
 * One admission into the community, as `/community/invite-history` returns it.
 *
 * The three plain strings are a snapshot taken when the admission happened, and
 * they are the durable part: `inviteCodeDocumentId` is null once the code is gone and
 * `user` is null once that account is, but the record still says who admitted
 * whom. No e-mail addresses, as with every other member-facing shape here.
 */
export interface InviteHistoryEntry {
  documentId: string;
  redeemedAt: string;
  code: string;
  issuedByUsername: string | null;
  redeemedByUsername: string;
  inviteCodeDocumentId: string | null;
  codeRevokedAt: string | null;
  user: InviteParty | null;
}

/** What the redeem endpoint answers with on success. */
export interface RedeemedInvite {
  redeemed: boolean;
  community: { documentId: string; name: string; server: GameServer } | null;
  role: { name: string; type: string };
}

/** The whole of what an officer may choose when issuing a code. */
export interface NewInviteCode {
  maxUses: number | null;
  expiresAt: string | null;
}
