## Why

The application is built for a single community: any authenticated user with a
non-default role sees the same boss list, the same user list, and the same
donations. To serve several guilds at once, the data model has to gain a
`Community` entity and every read path has to become community-scoped.

Strapi 5 cannot do that scoping for us. Its Content API permission layer is
binary per action — `toContentAPIPermission()` in
`@strapi/plugin-users-permissions` reduces a permission to `{ action }`, the
condition provider is registered but unused (`"at the moment, we're only using
the action one"` in `@strapi/core/dist/services/content-api/permissions/index.js`),
and `rulesToQuery` — the CASL-to-SQL bridge — exists only in `@strapi/admin`,
never on the Content API path. Row-level security is therefore application code
we own, in Community edition and Enterprise alike. Upgrading the plan would
change nothing.

That makes correctness-by-construction the priority: the frontend bundles
`API_URL` into the client (`next.config.js` `env`) and the JWT lives in a
JS-readable cookie, so every isolation guarantee must hold against a raw
`curl` against `:1337`. `proxy.ts` can only hide UI.

The same audit surfaced a live privilege-escalation path that this change must
close before adding a `community` attribute to `User`: the custom
`PUT /users/me` handler discards the validated body and forwards
`{ ...ctx.request.body }` to the Document Service, which applies any model
attribute. Today that lets any authenticated user set their own `role`; after
`community` lands it would also let them join any community by id.

## What Changes

- New `Community` collection type (`name`, `server` enumeration, optional square
  `logo`), managed exclusively through the Strapi admin panel — no Content API
  role receives permission on it.
- `User` gains a `community` relation (many users to one community), assignable
  from the Strapi admin panel.
- **BREAKING** — Access gate moves from "role is not `authenticated`" to
  "belongs to a community **and** role is not `authenticated`". Users without a
  community reach a stub prompting them for an invite code.
- **BREAKING** — Every Content API permission on
  `plugin::users-permissions.user` (`find`, `findOne`, `count`, `update`,
  `destroy`) is revoked for all roles. The member list moves to a new
  community-scoped API. `updateUser`/`deleteUser` in the frontend API client
  stop working against `/users/:id`.
- **BREAKING** — `PUT /users/me` and `PUT /users/:id` accept an explicit field
  allowlist instead of the whole request body. `role` and `community` are no
  longer self-assignable.
- New `InviteCode` collection type with single- or multi-use semantics, an
  expiry, and revocation. Officers create and manage codes for their own
  community; a community-less user redeems one to join and is granted the
  `viewer` role.
- Socket.io stops broadcasting the online-user map globally: connections
  authenticate by JWT and join a per-community room.
- Profile navigation: `/profile` lands on `/profile/management`; the
  `/profile/collections` link is commented out and marked for later removal.
  Officers gain an invite-management section.

Explicit non-goals: the `Boss` catalog rework and its per-community overlay
(`apps/frontend/mocks/raid-bosses/data.ts`) are a separate change; the
`Collection` and `Effect` collection types are only unlinked from navigation
here, not deleted; communities remain admin-created, with no self-service
creation; a user belongs to at most one community.

## Capabilities

### New Capabilities
- `user-account-updates`: which attributes a user may change about themselves,
  and which an operator may change about another user. Closes the mass-assignment
  path and is a prerequisite for every capability below.
- `community`: the `Community` entity, its fields and constraints, the
  user-to-community binding, and admin-panel-only management.
- `community-membership-gate`: what a user may reach depending on community
  membership and role, including the community-less stub.
- `community-isolation`: the guarantee that a user can observe only members of
  their own community, across REST and websockets, and the fail-closed API shape
  that provides it.
- `community-invites`: invite-code lifecycle — creation, listing, revocation,
  expiry, use limits, and redemption.
- `profile-navigation`: profile landing page and which profile sections are
  visible for which role.

### Modified Capabilities
<!-- openspec/specs/ is empty; this change introduces the first specs. -->

## Impact

Backend (`apps/backend`):
- `src/extensions/users-permissions/strapi-server.ts` — field allowlists,
  removal of the unscoped `find`/`findOne`/`update` overrides, `community`
  populated into `/users/me`.
- `src/index.ts` — Socket.io JWT handshake and per-community rooms; the
  `newDonations` broadcast stays global.
- New `src/api/community/`, `src/api/invite-code/`, and a community-member
  read API; new route policies (`has-community`, `is-officer`,
  `same-community`).
- `src/extensions/users-permissions/content-types/user/schema.json` — new
  `community` relation.
- Users-permissions role configuration (stored in the database, not in code) —
  permissions on `plugin::users-permissions.user` revoked for every role.
- A data migration seeding a default community and assigning existing
  non-`authenticated` users to it.
- Concurrency on invite redemption needs `strapi.db.transaction()`; SQLite
  serializes writes and already forces a retry loop in
  `scripts/e2e-fixture-role.js`, so the Postgres switch (`config/database.ts`
  is ready) should precede the invite stage.

Frontend (`apps/frontend`):
- `contexts/auth-context.tsx` — `allowed` derivation, new `community` on the
  user object.
- `lib/api/user.ts` — `/users/:id` calls replaced by the community-member API.
- `components/not-allowed-block` — invite-code stub.
- `app/profile/page.tsx`, `components/profile-content`, `components/header` —
  navigation changes and the officer invite section.
- `types/user.types.ts`, `types/index.ts` — `Community`, `InviteCode` types.
- `contexts/collection-context` — still calls `PUT /users/me` with
  `collections`; must keep working under the new allowlist.
- `e2e/` — negative tests asserting cross-community reads fail.
