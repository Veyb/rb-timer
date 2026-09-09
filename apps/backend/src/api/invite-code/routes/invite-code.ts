/**
 * The invite-code endpoints, hand-written for the same reason the member API
 * is: a core router would generate unscoped CRUD, and "list invite codes" with
 * no community scope hands every community's codes to anyone holding the
 * action.
 *
 * The `/community/` prefix is a claim about the answer, not a parameter in it:
 * everything under it is scoped to the caller's own community, taken from the
 * token. The three management routes sit behind `is-officer`, which requires
 * both the role and a community, and every handler applies that scope as the
 * `where` clause itself — a caller who could not be scoped is refused rather
 * than answered.
 *
 * Redemption is deliberately outside the prefix, and it is the only route here
 * that is. It works on a code of a community the caller does not belong to,
 * which is the whole point of an invitation; the prefix would say otherwise.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/community/invite-codes',
      handler: 'invite-code.create',
      config: {
        policies: ['global::is-officer'],
      },
    },
    {
      method: 'GET',
      path: '/community/invite-codes',
      handler: 'invite-code.find',
      config: {
        policies: ['global::is-officer'],
      },
    },
    {
      method: 'POST',
      path: '/invite-codes/redeem',
      handler: 'invite-code.redeem',
      config: {
        // Runs after `authenticate` and `authorize`, so it keys on a verified
        // account id rather than on anything the request controls.
        middlewares: ['global::invite-redeem-rate-limit'],
      },
    },
    // The only way an officer ends a code, and it is not a deletion. An
    // officer who could remove a code could invite whoever they liked and
    // leave nothing behind — not even a trace of which account issued it. So
    // there is no DELETE here at all: revoking stops the code and keeps the
    // record, and removing a row is an operator's act from the admin panel.
    {
      method: 'POST',
      path: '/community/invite-codes/:id/revoke',
      handler: 'invite-code.revoke',
      config: {
        policies: ['global::is-officer'],
      },
    },
  ],
};
