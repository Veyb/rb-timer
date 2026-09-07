## Context

See `proposal.md` — Why. The findings that shape this design, all verified
against the installed Strapi 5.52.3:

1. **The Content API permission layer is action-only.**
   `toContentAPIPermission()` in
   `@strapi/plugin-users-permissions/server/src/services/permission.js` reduces a
   stored permission to `{ action }`. The CASL engine in `@strapi/permissions`
   does support conditions, but the Content API never supplies any — see the
   comment in `@strapi/core/dist/services/content-api/permissions/index.js`:
   *"we define both an action and condition provider, but at the moment, we're
   only using the action one"*. And `rulesToQuery`, which turns CASL rules into
   query filters, appears only under `@strapi/admin`. So granting a role an
   action grants it over every row, with no framework-level way to narrow that.

2. **Admin RBAC is a different system.** `admin_*` tables, its own conditions
   (`admin::is-creator`), its own `rulesToQuery`. It governs the admin panel
   only. End users never authenticate against it, so it cannot help here. The
   Enterprise feature list in `@strapi/core/dist/ee/license.js` — `sso`,
   `audit-logs`, `review-workflows`, `cms-content-releases`,
   `cms-content-history`, `cms-advanced-preview` — contains nothing relevant
   either. A licence upgrade would not change this design.

3. **The client is not a trust boundary.** `next.config.js` publishes `API_URL`
   through the `env` key, so it is compiled into the browser bundle, and the JWT
   is stored in a JS-readable cookie. `proxy.ts` only redirects on a missing
   cookie. Every guarantee in `specs/community-isolation/` must therefore hold
   against a hand-written request to port 1337.

4. **`strapi.requestContext`** (`@strapi/core/dist/services/request-context.js`)
   is an `AsyncLocalStorage` holding the Koa context, and
   `ctx.state.auth.strategy.name` (assigned in
   `@strapi/core/dist/services/auth/index.js`) distinguishes
   `users-permissions` from `admin` and `api-token`. Together they make a global
   backstop possible without affecting the admin panel.

5. **A live mass-assignment path.** `src/extensions/users-permissions/strapi-server.ts`
   discards the result of `validateUpdateUserBody` and forwards
   `{ ...ctx.request.body }` to `user.service.edit()`, which passes it to the
   Document Service unfiltered. `validateYupSchema` runs Yup with
   `{ strict: true }`, which disables coercion but does not strip unknown keys,
   and the schema has no `.noUnknown()`. `PUT /users/me` is necessarily
   permitted — `contexts/collection-context` uses it — so any user can set
   their own `role` today, and would be able to set their own `community` the
   moment that attribute exists.

## Goals / Non-Goals

**Goals:**

- Make cross-community reads impossible by construction rather than by review:
  the absence of a scoping clause should produce a refusal, not a leak.
- Keep the Strapi admin panel fully unscoped — operators must see everything.
- Sequence the work so that each stage is independently shippable and the
  isolation stage can be reviewed on its own.

**Non-Goals:**

- Per-community roles. A user has one community and one global
  users-permissions role; the role's meaning is scoped by policy, not stored
  per membership.
- Database-level or schema-level tenancy. One schema, one connection, scoping in
  the application layer.
- Self-service community creation, community switching without an operator, and
  membership in several communities at once.

## Decisions

### Decision 1: One `community` relation on `User`, not a `Membership` entity

`User.community` is a `manyToOne` relation; the users-permissions role stays
global and unchanged.

*Alternative considered:* a `Membership` join entity carrying `(user,
community, role)`. It would allow several memberships per user and per-community
roles, but it strands the users-permissions role model — every route would need
an "active community" resolved from a header or parameter, the frontend would
need a community switcher, and all authorization would move into custom
policies. Rejected because the product requires exactly one community per user;
the join entity buys flexibility that is not wanted and costs a rewrite of the
authorization path.

*Consequence:* moving to multiple memberships later is a migration, not a
refactor. Accepted deliberately.

### Decision 2: Revoke the user endpoints entirely; add a scoped member API

Every users-permissions permission on `plugin::users-permissions.user`
(`find`, `findOne`, `count`, `update`, `destroy`) is turned off for every role.
Member data is served by a new API whose handlers read the community from
`ctx.state.user` and never from the request.

```
  REVOKED (no role holds these)          ADDED (scoped by construction)
  +-----------------------------+        +--------------------------------+
  | user.find                   |        | GET /community/members         |
  | user.findOne                |        | GET /community/members/:id     |
  | user.count                  |        | PUT /community/members/:id/role|
  | user.update                 |        +--------------------------------+
  | user.destroy                |        | POST   /invite-codes           |
  +-----------------------------+        | GET    /invite-codes           |
  KEPT (self-scoped by nature)           | DELETE /invite-codes/:id       |
  +-----------------------------+        | POST   /invite-codes/redeem    |
  | user.me      (own account)  |        +--------------------------------+
  | user.updateMe (own account) |
  +-----------------------------+
```

*Alternative considered:* keep the endpoints and add a forced community filter
inside the existing `find`/`findOne` overrides. Rejected as blacklist-shaped —
`count` and `destroy` are not currently overridden at all, and any future
users-permissions route would be exposed by default. The revocation approach
fails closed: a handler that forgets to scope has no route to be reached
through.

*Consequence:* `updateUser` and `deleteUser` in `apps/frontend/lib/api/user.ts`
stop working and must be replaced. This is the **BREAKING** item in the
proposal.

### Decision 3: Three enforcement tiers, in this order of authority

```
  1  ROUTE POLICY            has-community | is-officer
     +--------------------------------------------------------+
     |  may this caller reach this endpoint at all?            |
     +--------------------------------------------------------+
                              |
  2  FORCED SCOPE IN HANDLER  (the actual guarantee)
     +--------------------------------------------------------+
     |  community := ctx.state.user.community.id              |
     |  applied OVER client filters, never merged under them   |
     +--------------------------------------------------------+
                              |
  3  DOCUMENT-SERVICE MIDDLEWARE  (backstop only)
     +--------------------------------------------------------+
     |  const rc = strapi.requestContext.get();                 |
     |  if (rc?.state?.auth?.strategy?.name                    |
     |        !== 'users-permissions') return next();          |
     |  if (SCOPED_UIDS.has(ctx.uid)) injectCommunityFilter(); |
     +--------------------------------------------------------+
```

Tier 2 is the guarantee; tier 1 turns a scoping bug into a refusal; tier 3
catches a code path nobody remembered.

Tier 3 is deliberately constrained: an explicit `SCOPED_UIDS` allowlist, no
effect when there is no request context (CLI, migrations, lifecycle hooks) and
none when the caller authenticated through any strategy other than
`users-permissions`. It is added **after** tiers 1 and 2 pass their tests, and
it is optional — if it proves to obscure more than it protects, tiers 1 and 2
plus Decision 2 already satisfy the specs. Recorded here so the decision to
drop it is a decision and not an omission.

**Resolved: tier 3 is not built.** Not on grounds of taste — it would not
intercept the code it exists to back up. Document-service middlewares wrap only
the document repository (`middlewares.wrapObject(repository, ...)` in
`@strapi/core/dist/services/document-service/index.js`), so they see
`strapi.documents(uid).*` and nothing else. `@strapi/database` holds no
reference to them at all. Every member read goes through
`strapi.db.query('plugin::users-permissions.user')` — the member endpoints,
`/users/me`, the whole users-permissions extension — which is the query engine,
a layer below. The backstop would sit above the traffic it is meant to watch.

Making it intercept would mean rewriting the member API onto the Document
Service: a larger change than the backstop, for a layer whose entire value was
being cheap insurance.

And there is now little to insure. Decision 2 held: exactly one endpoint reads
member data, it takes the community from `ctx.state.user`, and the
general-purpose endpoints both refuse in code and go ungranted, reconciled on
every boot. A forgotten scope would have to be newly written code rather than a
silent reuse of an unscoped path — and it would arrive with tests. Against
that, the costs are real: scoping invisible at the call site, harder debugging,
and a wrong strategy check would quietly narrow the admin panel, which must see
everything.

*Revisit when:* the invite-code endpoints land. They need transactions, so they
may well be written against the Document Service — and if they are, this
middleware would cover a real path and become worth its cost. That is the
trigger, rather than "someday".

*Alternative considered:* registering a condition into
`strapi.contentAPI.permissions.providers.condition` and injecting it via the
engine's `format.permission` hook. Technically reachable, but the resulting CASL
condition is never translated into a query on the Content API path (finding 1),
so it would produce an ability that looks scoped and filters nothing. Rejected
as actively misleading.

### Decision 4: Field allowlists replace body spreading

`user.updateMe` accepts `email`, `username`, `password`, `nickname`,
`realname`, `collections`. `role` is changed only by
`PUT /community/members/:id/role`, whose contract carries nothing else.
`community` is changed only by an operator or by redeeming an invite code.

Rejecting an unexpected attribute is preferred over silently dropping it: a
client sending `role` to `/users/me` is either a defect or an attack, and
silence conceals both.

*Sequencing:* this lands first, on its own branch, ahead of everything else —
it closes a live escalation and it is the precondition for `community` being
safe to add at all.

### Decision 5: Invite codes — one counter, one transaction

`InviteCode` carries `code`, `community`, `maxUses` (null = unlimited),
`usedCount`, `expiresAt` (null = never), `revokedAt`, and `createdBy`. A
separate `InviteRedemption` record attributes each use.

A single-use flag is not stored; `maxUses = 1` expresses it.

Redemption runs inside `strapi.db.transaction()` and re-reads the code inside
the transaction before incrementing, so the check and the increment cannot
interleave.

*Consequence for the database:* SQLite serializes writers and already forces a
retry loop in `apps/backend/scripts/e2e-fixture-role.js`. `config/database.ts`
supports Postgres through `DATABASE_CLIENT`, so the switch should happen before
the invite stage rather than after.

*Code shape:* generated from a CSPRNG, presented grouped for legibility (for
example `GRN-7K2P-4M9X`), with an alphabet that excludes visually ambiguous
characters. Redemption is the only write endpoint a community-less user can
reach, so it is rate-limited per client, and every failure mode — unknown,
revoked, expired, exhausted — returns the same refusal so a code cannot be
probed for the community it belongs to.

### Decision 6: Realtime presence uses rooms, keyed by a verified identity

Current `src/index.ts` trusts `socket.on('auth', ({ user }) => ...)` and
broadcasts the whole online map with `io.emit`. Replaced by an `io.use()`
handshake that verifies the JWT server-side, then `socket.join('community:' +
id)` and `io.to(room).emit(...)`. The `newDonations` broadcast stays global —
donations are project-wide.

*Alternative considered:* filtering the payload per recipient while keeping the
global broadcast. Rejected — rooms make the scope structural, and the filtering
variant has to be re-derived correctly at every emit site.

### Decision 7: Square logo enforced server-side

Strapi's own dimension check for the admin logo
(`ApplicationInfo/utils/files.js`) runs in the browser with `FileReader` and
`new Image()`, on a bespoke settings page. It is not part of the media field and
cannot be reused by the Content Manager, which is where community logos are
uploaded in this version. A frontend constraint would therefore guard nothing.

A lifecycle hook on `Community` resolves the referenced upload file, compares
its stored `width` and `height`, and rejects a mismatch. This holds for the
admin panel, for the Content API, and for any future upload path.

## Risks / Trade-offs

- **A read path is added later without scoping.** → Decision 2 makes the
  default state "no route", tier 3 catches what slips through, and the isolation
  stage ships with negative end-to-end tests that assert a member of community A
  cannot retrieve a member of community B by any route.
- **Tier 3 misclassifies the caller and scopes the admin panel.** → Allowlisted
  UIDs only; explicit early return for every strategy other than
  `users-permissions`; an admin-panel smoke check in the same stage.
- **Existing users are stranded without a community after Stage 1.** → The
  migration seeds one community and assigns every user who currently holds a
  role other than the default to it, so nobody loses access. Users on the
  default role are already without access today.
- **The role axis and the membership axis disagree.** A user can hold
  `community + default role` (operator assigned a community but no role) or
  `role + no community` (legacy user). Both are gated, with distinct
  placeholders, per `specs/community-membership-gate/`.
- **Concurrent redemption over-admits on SQLite.** → Transaction plus in-
  transaction re-read; Postgres before the invite stage.
- **The `server` enumeration is expensive to change later.** → Accepted:
  boss lists do not differ per server, so nothing needs to relate to a server
  entity. Should that change, the enumeration becomes a relation in a migration.
- **`/profile/collections` and the `Collection`/`Effect` types linger.** →
  Deliberate: unlinking from navigation is reversible, deletion is not. Removal
  is a follow-up change once the data is confirmed unwanted.

## Migration Plan

1. **Field allowlists** (own branch, straight to `master`). No schema change, no
   data change. Rollback is a revert.
2. **`Community` + `User.community`.** Additive schema change. Seed one
   community from the existing deployment, assign every user holding a
   non-default role. Rollback: drop the relation; no user-visible behavior
   depended on it yet.
3. **Access gate.** Frontend-only derivation change plus `community` populated
   into `/users/me`. Rollback is a revert; the schema stays.
4. **Isolation.** Revoke the users-permissions permissions and ship the member
   API in one deployment — the frontend loses `/users/:id` at the same moment it
   gains `/community/members`. This step is not independently revertible from
   the frontend change; they deploy together.
5. **Postgres.** `DATABASE_CLIENT=postgres`, data transferred with Strapi's
   transfer tooling.
6. **Invite codes**, backend then frontend. Purely additive.

## Open Questions

- Whether a member may leave their community themselves, or only an operator may
  detach them. The specs require only that switching without leaving is refused;
  a self-service "leave" endpoint can be added later without touching anything
  decided here.
- Whether officers should receive a notification channel for sharing codes
  (Discord, e-mail) or whether copying a link from the profile section is
  enough. Stage 5 ships the link; a channel is additive.
