/**
 * The invite history of one's own community.
 *
 * Read-only by design: these rows are a record, and a record that the people
 * it describes can edit or remove is not one. Nothing in the Content API
 * writes here except the redeem endpoint, and nothing deletes here at all.
 *
 * Behind `is-officer` for the same reason the member management endpoints are:
 * the handler scopes its answer to `ctx.state.user.community`, so a caller who
 * could not be scoped is refused rather than answered.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/community/invite-history',
      handler: 'invite-redemption.find',
      config: {
        policies: ['global::is-officer'],
      },
    },
  ],
};
