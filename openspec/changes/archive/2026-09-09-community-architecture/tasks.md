## 1. Field allowlists (ships first, on its own branch)

- [x] 1.1 Replace the body spread in `user.updateMe` with an explicit allowlist of `email`, `username`, `password`, `nickname`, `realname`, `collections`, and verify a request carrying `role` is refused while a request carrying only `nickname` succeeds
- [x] 1.2 Apply the same allowlist discipline to `user.update` in `apps/backend/src/extensions/users-permissions/strapi-server.ts`, keeping `role` accepted on that path for now, and verify a request carrying `community` or `confirmed` is refused
- [x] 1.3 Add `.noUnknown()` (or an equivalent rejecting check) to `updateUserBodySchema` and use the validated result rather than the raw body, and verify the schema itself rejects an unknown key
- [x] 1.4 Confirm `register.allowedFields` in `apps/backend/config/plugins.ts` still excludes `role` and `community`, and verify a registration request carrying either produces an account with the default role and no community
- [x] 1.5 Add backend tests covering escalation attempts through `PUT /users/me` and `PUT /users/:id`, and verify they fail against the pre-fix code and pass after it
- [x] 1.6 Verify `contexts/collection-context` still saves collections through `PUT /users/me` by exercising the collections screen

## 2. Profile navigation cleanup

- [x] 2.1 Change `apps/frontend/app/profile/page.tsx` to redirect to `/profile/management`, and verify opening `/profile` lands on the management section
- [x] 2.2 Comment out the collections entry in the profile navigation with a marker noting it is to be deleted later, and verify no navigation element leads to the collections section while the route itself still renders
- [x] 2.3 Update or add an e2e assertion that the profile area opens on management, and verify the Playwright suite passes

## 3. Community entity and membership

- [x] 3.1 Create the `community` content type with required `name`, required `server` enumeration (`Gamma`, `Black`, `White`, `Carmine`, `MasterWork`) and optional single-image `logo`, and verify it appears in the Content Manager and rejects a missing name or an unknown server
- [x] 3.2 Add the `community` `manyToOne` relation to the user schema extension with the matching `users` inverse on `community`, and verify a community can be assigned to a user from the admin panel
- [x] 3.3 Leave every users-permissions role without any permission on `api::community.community`, and verify an authenticated request to the community collection endpoint is refused
- [x] 3.4 Add a `beforeCreate`/`beforeUpdate` lifecycle hook on `community` that resolves the referenced upload file and rejects a logo whose stored `width` and `height` differ, and verify a non-square upload is refused in the admin panel while a square one is accepted
- [x] 3.5 Populate `community` (with `logo`) into `user.me`, and verify `/users/me` returns the community's name, server and logo for a member and a null community for a community-less user
- [x] 3.6 Add `Community` to `apps/frontend/types` and extend the `User` type with the optional community, and verify `pnpm --filter frontend check-types` passes
- [x] 3.7 Write a migration that seeds one community from the current deployment and assigns every user holding a role other than the default to it, and verify after running it that no previously-privileged user is left without a community
- [x] 3.8 Extend the e2e fixtures so the fixture user is assigned a community, and verify the Playwright suite reaches the role-gated screens

## 4. Access gate

- [x] 4.1 Derive `allowed` in `contexts/auth-context.tsx` from community membership together with a non-default role, and verify a user with a role but no community is no longer treated as allowed
- [x] 4.2 Replace `components/not-allowed-block` with two distinct placeholders — one prompting a community-less user for an invite code, one directing a member on the default role to an officer — and verify each renders for its own case
- [x] 4.3 Add the invite-code input to the community-less placeholder, wired to a submit handler that is stubbed until the redeem endpoint exists, and verify the input renders and the placeholder still allows reaching the profile and signing out
- [x] 4.4 Verify the boss list screen shows the community-less placeholder instead of the list for a user without a community

## 5. Community isolation

- [x] 5.1 Add `has-community` and `is-officer` route policies reading only `ctx.state.user`, and verify each refuses the cases it is meant to refuse
- [x] 5.2 Implement `GET /community/members` returning only members of the caller's own community, with the community taken from `ctx.state.user` and applied over any client filter, and verify a request filtering for another community still returns only the caller's own
- [x] 5.3 Implement `GET /community/members/:id` returning a not-found result for a user outside the caller's community, and verify the response for a foreign member is indistinguishable from a missing record
- [x] 5.4 Implement `PUT /community/members/:id/role` accepting nothing but the role, restricted to officers and to members of the caller's own community, and verify a cross-community or community-less target is refused
- [x] 5.5 Sanitize member responses through the content-API sanitizer so no password hash, reset token, confirmation token, or another user's email is exposed, and verify the response body of the member list contains none of them
- [x] 5.6 Remove the unscoped `find`, `findOne` and `update` overrides that the member API replaces, keeping `me` and `updateMe`, and verify `pnpm --filter backend check-types` passes
- [x] 5.7 Revoke every users-permissions permission on `plugin::users-permissions.user` except `me` and `updateMe` for all roles, record how that role configuration is provisioned, and verify each revoked endpoint answers with a refusal for an officer
- [x] 5.8 Replace `/users/:id` calls in `apps/frontend/lib/api/user.ts` and its call sites with the member API, and verify the users screen and the member management screen still function
- [x] 5.13 Implement `DELETE /community/members/me`, clearing the membership and resetting the role to the registration default, refused for a community-less caller and for the only officer of a community, and verify each of those four behaviours
- [x] 5.14 Implement `DELETE /community/members/:id` for officers, scoped to their own community, refusing a self-target, and verify a fellow officer can be removed while another community's user answers as not-found
- [x] 5.15 Implement `DELETE /users/me` available to every signed-in role, taking no target, and verify the account and its membership are gone and that it cannot be aimed at anyone else
- [x] 5.16 Add a "leave community" control to the profile, and a "remove from community" control on a member's page for officers, and verify each appears only for the role that may use it
- [x] 5.17 Restore an account-deletion control on the caller's own profile only, behind a confirmation, and verify it no longer appears on another member's page
- [x] 5.9 Add an `io.use()` handshake in `apps/backend/src/index.ts` that verifies the JWT and resolves the user's community server-side, ignoring any client-supplied identity, and verify a connection without a valid credential receives no community data
- [x] 5.10 Replace the global `socketUsers` broadcast with per-community rooms, leaving `newDonations` global, and verify two members of different communities never appear in each other's presence data and that a community-less connection appears in none
- [x] 5.11 Add negative e2e tests asserting a member of one community cannot reach a member of another by any route — member list, member detail, role change, presence — and verify they pass
- [~] 5.12 SKIPPED — the document-service middleware backstop would not intercept the code it backs up: it wraps `strapi.documents(uid).*` only, while every member read goes through the query engine. See design.md, Decision 3, "Resolved"; revisit when the invite-code endpoints land

## 6. Database

- [x] 6.1 Switch the development and deployment configuration to `DATABASE_CLIENT=postgres`, transfer the existing data, and verify the application starts and the boss list, member list and admin panel all read correctly
- [x] 6.2 Rework `apps/backend/scripts/e2e-fixture-role.js` so it no longer talks to SQLite directly, and verify the Playwright suite still provisions its fixture user

## 7. Invite codes — backend

- [x] 7.1 Create the `invite-code` content type with `code`, `community`, `maxUses`, `usedCount`, `expiresAt`, `revokedAt` and `createdBy`, and verify a use limit below one is rejected
- [x] 7.2 Create the `invite-redemption` content type attributing a code, a user and a moment, and verify a record is written on each successful redemption
- [x] 7.3 Implement code generation from a CSPRNG using an alphabet without visually ambiguous characters, formatted in groups, and verify generated codes are unique across a large sample
- [x] 7.4 Implement `POST /invite-codes` for officers with the community taken from `ctx.state.user`, and verify a request naming another community still produces a code bound to the officer's own
- [x] 7.5 Implement `GET /invite-codes` scoped to the officer's own community, exposing remaining uses and expiry, and verify codes of another community never appear
- [x] 7.6 Implement revocation restricted to the officer's own community, and verify a revoked code can no longer be redeemed and a foreign code cannot be revoked — landed as `POST /invite-codes/:id/revoke` rather than `DELETE`, so that `DELETE /invite-codes/:id` can mean what it says (see 8.8)
- [x] 7.7 Implement `POST /invite-codes/redeem` inside `strapi.db.transaction()`, re-reading the code within the transaction before incrementing `usedCount`, and verify two simultaneous redemptions of a single-use code admit exactly one user
- [x] 7.8 Make redemption set the community and the `viewer` role, refuse a caller who already belongs to a community, and ignore any role named in the request, and verify each of those three behaviors
- [x] 7.9 Return one indistinguishable refusal for unknown, revoked, expired and exhausted codes, disclosing no community, and verify the four responses are identical
- [x] 7.10 Rate-limit redemption per client, and verify repeated invalid submissions are throttled
- [x] 7.11 Grant the redeem action to the default role and the invite-code management actions to `officer` only, and verify a `viewer` cannot create a code and a community-less user can attempt a redemption

## 8. Invite codes — frontend

- [x] 8.1 Add `InviteCode` types and API client functions, and verify `pnpm --filter frontend check-types` passes
- [x] 8.2 Add the invite management section to the profile area, visible only to an officer who belongs to a community, and verify it is absent for `viewer`, `editor` and a community-less officer
- [x] 8.3 Build the code creation form covering use limit and expiry, and verify a created code appears in the list with its remaining uses and expiry
- [x] 8.4 Show each code's redemptions to its officer, and verify the redeeming users and moments are listed
- [x] 8.5 Add code revocation to the management section, and verify a revoked code is reflected in the list
- [x] 8.6 Add a shareable join link carrying the code and a `/join` route that pre-fills it, and verify opening the link as a community-less user pre-fills the code
- [x] 8.7 Wire the placeholder's invite-code input to the redeem endpoint, and verify a successful redemption grants access without a manual reload and a refusal shows an error
- [x] 8.8 Give the redemption record a snapshot of the code, the issuing account's name and the joining account's name, and its own relation to the community, and verify the record still names both after the code is deleted, after the joining account deletes itself, and after both
- [x] 8.9 Implement `GET /community/invite-history` for officers of their own community, and verify a foreign community's admissions never appear, a non-officer holding the action is still refused by the policy, and no e-mail address is disclosed
- [x] 8.10 Add the invite history section with a search over names and codes, and verify a deleted account and a deleted code are each still shown by the name recorded at the time
- [x] 8.13 Move invitations out of the profile into a section of their own at `/invites`, with `Коды` and `История` subsections and an entry in the user menu, and verify the entry is absent for a non-officer, the address answers a non-officer with a statement rather than a redirect, and the profile offers neither section any more
- [x] 8.14 Rename `allowedAdminister` to `allowedManage` across the frontend, and verify `pnpm --filter frontend check-types` passes
- [x] 8.15 Move the officer invite-code endpoints under `/community/` alongside the member and history endpoints, leaving redemption outside it because it acts on another community's code, and verify the old addresses no longer answer
- [x] 8.16 Address and return every document by `documentId` rather than by the numeric key, name roles by `type`, and carry the same through the realtime presence payload, and verify a numeric key answers as not found
- [x] 8.17 Move the Authorization and JSON header construction into `lib/api/base.ts` and use it from every client, and verify `getRoles` no longer sends `Bearer undefined` when called without a token
- [x] 8.20 Drop the registration default from the roles an officer may assign, leaving removal as the only way to take a member's access away, and verify the role list omits it and an attempt to set it is rejected
- [x] 8.24 Move the session cookie behind a data access layer memoised with `React.cache`, as the framework's authentication guide recommends, so no page knows the cookie's name and a layout and its page share one `/users/me`, and verify every route makes exactly one such request
- [x] 8.23 Send a caller who opens their own member page to their own profile instead, compute `isOwnProfile` rather than hardcoding it, and verify no role control and no removal control is offered for one's own account
- [x] 8.22 Show a member's own role in the officer's role control even when it is not one an officer may assign, offered but not selectable, and derive the member-list role filter from the members on screen, and verify a member on the registration default reads as a name rather than as `authenticated` and can still be filtered for
- [x] 8.21 Collect the role vocabulary in `types/role.types.ts` as a single `Role` shape, replacing the two identical interfaces that differed only in where the value came from, and verify `pnpm --filter frontend check-types` passes
- [x] 8.19 Serve the assignable roles from `GET /community/member-roles` as name and type only, revoke the users-permissions role endpoints for every role, and verify an officer can no longer read installation-wide account counts or a role's permission map
- [x] 8.18 Split `apiGet` into the raw form this app's own endpoints speak and `apiGetList` for Strapi's `{ data, meta }` collections, typed by the caller, so the shape is declared rather than guessed from the body
- [x] 8.11 Offer no deletion of invite codes to officers at all — only revocation — and verify no route answers a delete, recording in the spec why: an officer who could remove a code could admit whoever they liked and leave no trace of who issued it
- [x] 8.12 Give the e2e suite a teardown that returns the joiner account to having no community and removes the invite codes the run issued, scoped to codes issued by the fixture officer, and verify a code issued by anyone else survives it

## 9. Verification

- [x] 9.1 Run the full Playwright suite plus `pnpm check` and `pnpm check-types` across the workspace, and verify all pass
- [x] 9.2 Walk the whole journey manually — register, hit the placeholder, redeem a code, view the member list, have an officer raise a role, issue and revoke a code — and verify each step behaves as its spec scenario describes
- [x] 9.3 Attempt every isolation bypass from `specs/community-isolation/spec.md` with a hand-written request against the backend port rather than through the UI, and verify each is refused
