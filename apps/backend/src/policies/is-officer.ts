/**
 * Refuses a caller who is not an officer of a community.
 *
 * Membership is required as well as the role: an officer with no community has
 * nothing to administer, and every endpoint behind this policy scopes its work
 * to `ctx.state.user.community`.
 */
export default (policyContext) => {
  const user = policyContext.state?.user;

  return Boolean(user?.community) && user?.role?.type === 'officer';
};
