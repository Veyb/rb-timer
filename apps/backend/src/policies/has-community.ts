/**
 * Refuses a caller who belongs to no community.
 *
 * First of the three enforcement tiers: it turns a missing scope into a
 * refusal instead of an unscoped query. The guarantee itself is the forced
 * community filter inside each handler — this only makes sure a handler that
 * needs a community is never reached without one.
 *
 * `community` is on `ctx.state.user` because the users-permissions extension
 * populates it; the plugin alone would only populate `role`.
 */
export default (policyContext) => Boolean(policyContext.state?.user?.community);
