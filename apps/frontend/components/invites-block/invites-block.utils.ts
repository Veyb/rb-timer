// local modules
import type { InviteCode } from '../../types';

/**
 * Why a code cannot be used, or that it can. The backend refuses every
 * unusable code with one indistinguishable message — deliberately, so a code
 * cannot be probed for the community behind it — but an officer looking at
 * their own codes is on the other side of that: for them the reason is the
 * whole point of the list.
 */
export type InviteCodeStatus = 'active' | 'revoked' | 'expired' | 'exhausted';

export const statusOf = (code: InviteCode, now = new Date()): InviteCodeStatus => {
  if (code.revokedAt) return 'revoked';
  if (code.expiresAt && new Date(code.expiresAt).getTime() <= now.getTime()) return 'expired';
  if (code.maxUses != null && code.usedCount >= code.maxUses) return 'exhausted';

  return 'active';
};

export const STATUS_LABELS: Record<InviteCodeStatus, string> = {
  active: 'Активен',
  revoked: 'Отозван',
  expired: 'Истёк',
  exhausted: 'Исчерпан',
};

/** How many uses are left, in words — a null ceiling has nothing to count down. */
export const remainingLabel = (code: InviteCode) =>
  code.remainingUses == null
    ? `Без ограничения (использован ${code.usedCount})`
    : `Осталось ${code.remainingUses} из ${code.maxUses}`;

/** Presets rather than a free number field: these are the limits anyone picks. */
export const MAX_USES_OPTIONS = [
  { value: 1, label: 'Одноразовый' },
  { value: 5, label: '5 использований' },
  { value: 10, label: '10 использований' },
  { value: 25, label: '25 использований' },
  { value: 0, label: 'Без ограничения' },
] as const;

/** Lifetimes in hours; zero means the code never expires. */
export const EXPIRY_OPTIONS = [
  { value: 24, label: '1 день' },
  { value: 24 * 7, label: '7 дней' },
  { value: 24 * 30, label: '30 дней' },
  { value: 1, label: '1 час' },
  { value: 0, label: 'Бессрочно' },
] as const;

/**
 * Turns the two presets into the body the endpoint accepts. Zero is the
 * "no limit" sentinel in both selects — the API takes null, and a use limit of
 * zero is refused outright, so the two cannot be confused.
 */
export const toNewInviteCode = (maxUses: number, expiryHours: number) => ({
  maxUses: maxUses === 0 ? null : maxUses,
  expiresAt:
    expiryHours === 0 ? null : new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
});

/** The link an officer hands to someone outside the app. */
export const joinLinkFor = (code: string, origin: string) =>
  `${origin}/join?code=${encodeURIComponent(code)}`;
