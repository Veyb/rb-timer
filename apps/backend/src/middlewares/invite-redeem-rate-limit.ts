/**
 * Throttles invite-code redemption per account.
 *
 * Redemption is the one write endpoint a user with no community can reach, and
 * the one place where guessing at a code has any point. Route middlewares run
 * after `authenticate` and `authorize` (see `compose-endpoint.ts` in
 * `@strapi/core`), so by the time this runs the caller is a known account and
 * the key can be their id.
 *
 * Not `plugin::users-permissions.rateLimit`, which is what the auth routes use:
 * its bucket key includes `ctx.request.body.email` for any route outside a
 * short hardcoded list. The redeem body has no `email` field, but nothing stops
 * a caller adding one — the body is validated in the handler, which is past
 * this point in the chain — and a different value there would mean a different
 * bucket on every attempt. Keying on the authenticated id leaves nothing for
 * the request to vary.
 *
 * The window lives in this process, like the plugin's default memory store: it
 * resets on restart and is not shared between instances. That is the same
 * guarantee the sign-in endpoint already gives, and this deployment runs one
 * instance.
 */

import { errors } from '@strapi/utils';

const { RateLimitError } = errors;

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/**
 * Above this many tracked keys the expired ones are swept. A bound is needed
 * because the map is keyed by account id and would otherwise grow with every
 * user who ever redeems.
 */
const SWEEP_THRESHOLD = 1000;

const windows = new Map<string, { count: number; resetAt: number }>();

const sweep = (now: number) => {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
};

export default () => async (ctx, next) => {
  const now = Date.now();

  if (windows.size > SWEEP_THRESHOLD) sweep(now);

  // The id is always there in practice — `authorize` has already run and the
  // action is granted to signed-in roles only. The address is a fallback so a
  // future change to that grant cannot turn the limit off by accident.
  const key = ctx.state.user?.id ? `user:${ctx.state.user.id}` : `ip:${ctx.request.ip}`;
  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  window.count += 1;

  if (window.count > MAX_ATTEMPTS) {
    // Every attempt counts, not only the failed ones. A user needs exactly one
    // success — after it they belong to a community and the handler refuses
    // them anyway — so there is no legitimate traffic for a looser rule to
    // protect, and counting failures alone would need the outcome of a handler
    // that has not run yet.
    throw new RateLimitError();
  }

  return next();
};
