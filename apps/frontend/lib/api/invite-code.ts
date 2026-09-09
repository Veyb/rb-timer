// global modules
import axios from 'axios';

// local modules
import type { InviteCode, InviteHistoryEntry, NewInviteCode, RedeemedInvite } from '../../types';
import { API_URL, apiGet, authHeaders, jsonHeaders } from './base';

/**
 * Invite codes. Three officer endpoints under `/community/`, all scoped
 * server-side to the caller's own community, and one redemption endpoint
 * outside that prefix — deliberately, since it works on a code of a community
 * the caller does not belong to. Every signed-in role may call it, but only a
 * user without a community gets anywhere with it.
 *
 * Each request body carries exactly what the endpoint accepts — the backend
 * refuses an unknown key rather than dropping it, so an extra field here would
 * turn into a 400 rather than being quietly ignored.
 */

/** The codes of the caller's own community, newest first. */
export async function getInviteCodes(token: string | undefined) {
  return apiGet<InviteCode[]>('/community/invite-codes', authHeaders(token));
}

/**
 * Issues a code. The community it binds to is not a parameter: the backend
 * takes it from the officer's own membership.
 */
export async function createInviteCode(input: NewInviteCode, token: string | undefined) {
  const { data } = await axios.post(`${API_URL}/community/invite-codes`, input, jsonHeaders(token));

  return data as InviteCode;
}

/**
 * Revokes a code: it stops working, and the record of who it let in stays.
 *
 * The only ending on offer. There is no delete: an officer who could remove a
 * code could invite whoever they liked and leave nothing behind, not even a
 * trace of which account issued it.
 */
export async function revokeInviteCode(documentId: string, token: string | undefined) {
  const { data } = await axios.post(
    `${API_URL}/community/invite-codes/${documentId}/revoke`,
    {},
    jsonHeaders(token),
  );

  return data as InviteCode;
}

/**
 * Who was admitted into the caller's own community, when, and on whose
 * invitation. Scoped server-side like everything else here.
 */
export async function getInviteHistory(token: string | undefined) {
  return apiGet<InviteHistoryEntry[]>('/community/invite-history', authHeaders(token));
}

/**
 * Redeems a code, joining the caller to its community as a viewer.
 *
 * Case and separators do not matter — the backend normalises them — so the raw
 * input goes through as typed.
 */
export async function redeemInviteCode(code: string, token: string | undefined) {
  const { data } = await axios.post(`${API_URL}/invite-codes/redeem`, { code }, jsonHeaders(token));

  return data as RedeemedInvite;
}
