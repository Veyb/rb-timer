export default () => ({
  'users-permissions': {
    config: {
      register: {
        // The user content-type requires `nickname` and `realname` on
        // registration; Strapi 5's users-permissions plugin rejects any
        // request body field outside this allowlist by default.
        //
        // Keep privileged attributes off this list. The role of a new account
        // comes from the plugin's `default_role` setting, and `community` is
        // granted only by an operator or by redeeming an invite code — adding
        // either here would let a registration request pick its own.
        allowedFields: ['nickname', 'realname'],
      },
    },
  },
});
