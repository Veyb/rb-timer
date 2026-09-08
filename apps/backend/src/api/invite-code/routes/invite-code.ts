/**
 * The invite-code endpoints, hand-written for the same reason the member API
 * is: a core router would generate unscoped CRUD, and "list invite codes" with
 * no community scope hands every community's codes to anyone holding the
 * action.
 *
 * The three management routes sit behind `is-officer`, which requires both the
 * role and a community — every handler scopes its work to
 * `ctx.state.user.community`, so a caller who could not be scoped is refused
 * rather than answered.
 *
 * Redemption is the exception and carries no community policy: a caller who
 * already has one is precisely who it must refuse, and it says so itself.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/invite-codes',
      handler: 'invite-code.create',
      config: {
        policies: ['global::is-officer'],
      },
    },
    {
      method: 'GET',
      path: '/invite-codes',
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
    {
      method: 'DELETE',
      path: '/invite-codes/:id',
      handler: 'invite-code.revoke',
      config: {
        policies: ['global::is-officer'],
      },
    },
  ],
};
