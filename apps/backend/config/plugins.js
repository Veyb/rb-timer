module.exports = () => ({
  "users-permissions": {
    config: {
      register: {
        // The user content-type requires `nickname` and `realname` on
        // registration; Strapi 5's users-permissions plugin rejects any
        // request body field outside this allowlist by default.
        allowedFields: ["nickname", "realname"],
      },
    },
  },
});
