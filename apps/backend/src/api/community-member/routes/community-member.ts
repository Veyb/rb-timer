/**
 * The only way member data reaches the Content API.
 *
 * The general-purpose user endpoints are revoked for every role, so these
 * routes replace them. Each one is scoped to the caller's own community inside
 * its handler; the policies here refuse a caller who could not be scoped at
 * all, so a missing scope is a refusal rather than an unscoped read.
 */
export default {
  routes: [
    // Before `/community/members/:id`, which would otherwise capture it.
    {
      method: 'GET',
      path: '/community/member-roles',
      handler: 'community-member.roles',
      config: {
        policies: ['global::is-officer'],
      },
    },
    {
      method: 'GET',
      path: '/community/members',
      handler: 'community-member.find',
      config: {
        policies: ['global::has-community'],
      },
    },
    {
      method: 'GET',
      path: '/community/members/:id',
      handler: 'community-member.findOne',
      config: {
        policies: ['global::has-community'],
      },
    },
    {
      method: 'PUT',
      path: '/community/members/:id/role',
      handler: 'community-member.updateRole',
      config: {
        policies: ['global::is-officer'],
      },
    },
    // Before the `:id` route below, which would otherwise capture "me".
    {
      method: 'DELETE',
      path: '/community/members/me',
      handler: 'community-member.leave',
      config: {
        policies: ['global::has-community'],
      },
    },
    {
      method: 'DELETE',
      path: '/community/members/:id',
      handler: 'community-member.remove',
      config: {
        policies: ['global::is-officer'],
      },
    },
  ],
};
