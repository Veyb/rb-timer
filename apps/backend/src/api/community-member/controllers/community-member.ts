import { errors } from '@strapi/utils';

const { NotFoundError, PolicyError, ValidationError } = errors;

/**
 * A 403 whose message survives.
 *
 * `createAuthorizeMiddleware` wraps the whole downstream chain, handlers
 * included, and converts any `ForbiddenError` into a bare `ctx.forbidden()` —
 * the client then reads "Forbidden" and learns nothing. Strapi's own comment
 * there names `PolicyError` as the deliberate exception: "allow PolicyError as
 * an exception to throw a publicly visible message in the API". It extends
 * `ForbiddenError`, so the status is still 403.
 */
const refuse = (message: string) => new PolicyError(message);

const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

/**
 * What a member may learn about another member of the same community. An
 * allowlist rather than an omit-list: a later attribute on the user model is
 * then invisible by default instead of exposed until someone notices.
 *
 * `email` is deliberately absent — a member's address is their own business,
 * and the old `/users` endpoint leaked every one of them.
 *
 * The numeric `id` is absent too. It is the database's key, not the document's
 * name: Strapi 5 addresses documents by `documentId` and every route here does
 * the same, so returning both would only invite a caller to pick the wrong one.
 * A role is named by its `type`, which is what the endpoints below accept.
 */
const MEMBER_FIELDS = ['documentId', 'username', 'nickname', 'realname', 'createdAt'];

const toMember = (user) => ({
  ...Object.fromEntries(MEMBER_FIELDS.map((field) => [field, user[field]])),
  role: user.role ? { name: user.role.name, type: user.role.type } : null,
});

/**
 * Roles an officer may hand out, and the whole of what
 * `GET /community/member-roles` answers with.
 *
 * `public` is not a role a user can hold. The registration default is absent
 * too, and that is the interesting one: assigning it would leave a member of
 * the community with no access and no explanation, which is what removing them
 * from the community already does — except that removal says so, asks for
 * confirmation, and can be undone with an invite code. A rank list is the wrong
 * place for an act that is not a rank; the day suspension is wanted, it wants
 * its own control and its own words.
 *
 * A member an operator left on the default role is not stranded by this: every
 * role above it is still assignable, so an officer can raise them.
 *
 * The officer screen used to read the plugin's own `/users-permissions/roles`,
 * which hands out `nb_users` — a count across every community in the
 * installation — and, on `findOne`, the role's entire permission map. Neither
 * is an officer's business, and the screen only ever wanted a name and a type.
 */
const ASSIGNABLE_ROLE_TYPES = ['viewer', 'editor', 'officer'];

/**
 * Detaches a user from their community and puts the role back to what
 * registration grants.
 *
 * A role means something inside a community — an editor of one guild is not an
 * editor of the next — so it does not travel out with the user. Redeeming an
 * invite code grants `viewer` again.
 */
const detachFromCommunity = async (userId: number) => {
  const advanced = (await strapi
    .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
    .get()) as { default_role?: string };

  const defaultRole = await strapi.db.query(ROLE_UID).findOne({
    where: { type: advanced?.default_role ?? 'authenticated' },
  });

  await strapi.db.query(USER_UID).update({
    where: { id: userId },
    data: { community: null, ...(defaultRole ? { role: defaultRole.id } : {}) },
  });
};

const countOfficers = async (communityId: number) =>
  strapi.db.query(USER_UID).count({
    where: { community: communityId, role: { type: 'officer' } },
  });

export default {
  /**
   * The roles an officer may assign, named and nothing more.
   *
   * Not scoped to a community because roles are not community data — but
   * deliberately narrow, which is the point: the plugin's own endpoint answers
   * the same question with installation-wide user counts and permission maps
   * attached.
   */
  async roles() {
    const roles = await strapi.db
      .query(ROLE_UID)
      .findMany({ where: { type: { $in: ASSIGNABLE_ROLE_TYPES } } });

    // Ordered as declared, so the screen lists them least to most privileged
    // rather than in whatever order the database returns.
    return ASSIGNABLE_ROLE_TYPES.map((type) => roles.find((role) => role.type === type))
      .filter(Boolean)
      .map((role) => ({ name: role.name, type: role.type }));
  },

  /**
   * Members of the caller's own community.
   *
   * The community comes from `ctx.state.user` and is applied as the `where`
   * clause itself — client query parameters are never merged into it, so no
   * filter can widen the result set. Users of another community and users with
   * no community are outside the clause by construction.
   */
  async find(ctx) {
    const users = await strapi.db.query(USER_UID).findMany({
      where: { community: ctx.state.user.community.id },
      populate: { role: true },
      orderBy: { nickname: 'asc' },
    });

    ctx.body = users.map(toMember);
  },

  /**
   * One member of the caller's own community.
   *
   * A member of another community answers exactly like a missing record: the
   * response must not disclose that the account exists.
   */
  async findOne(ctx) {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { documentId: ctx.params.id, community: ctx.state.user.community.id },
      populate: { role: true },
    });

    if (!user) {
      throw new NotFoundError('Member not found');
    }

    ctx.body = toMember(user);
  },

  /**
   * Changes one member's role and nothing else.
   *
   * The contract carries a single attribute on purpose. `PUT /users/:id` used
   * to accept a whole user payload, which is how a request body could grant
   * itself a role in the first place.
   *
   * The role is named by its `type` — `viewer`, `editor` — and not by an id.
   * One name for one thing: an endpoint that took either would be an endpoint
   * whose contract you have to read the body of to know.
   */
  async updateRole(ctx) {
    const { role } = ctx.request.body ?? {};

    if (typeof role !== 'string' || role === '') {
      throw new ValidationError('role is required, as a role type');
    }

    const target = await strapi.db.query(USER_UID).findOne({
      where: { documentId: ctx.params.id, community: ctx.state.user.community.id },
      populate: { role: true },
    });

    if (!target) {
      throw new NotFoundError('Member not found');
    }

    const nextRole = ASSIGNABLE_ROLE_TYPES.includes(role)
      ? await strapi.db.query(ROLE_UID).findOne({ where: { type: role } })
      : null;

    if (!nextRole) {
      throw new ValidationError(`role must be one of ${ASSIGNABLE_ROLE_TYPES.join(', ')}`);
    }

    if (Number(target.id) === Number(ctx.state.user.id)) {
      // An officer demoting themselves could leave a community with nobody able
      // to administer it, and there is no self-service way back.
      throw refuse('An officer cannot change their own role');
    }

    await strapi.db.query(USER_UID).update({
      where: { id: target.id },
      data: { role: nextRole.id },
    });

    const updated = await strapi.db.query(USER_UID).findOne({
      where: { id: target.id },
      populate: { role: true },
    });

    ctx.body = toMember(updated);
  },

  /**
   * The caller leaves their own community. Takes no target: the route has no
   * `:id`, so it cannot be pointed at anyone else.
   */
  async leave(ctx) {
    const { user } = ctx.state;

    if (user.role?.type === 'officer' && (await countOfficers(user.community.id)) <= 1) {
      // Nothing self-service can appoint a replacement, so leaving here would
      // strand the community with no one able to administer members or codes.
      throw refuse(
        'The last officer of a community cannot leave it. Appoint another officer first.',
      );
    }

    await detachFromCommunity(user.id);

    ctx.body = { left: true };
  },

  /**
   * An officer removes a member of their own community. Anyone but themselves,
   * fellow officers included — an officer granted by mistake has to be
   * removable without reaching for the admin panel. Leaving is the deliberate
   * way out for oneself, and it is the path that checks the last-officer rule.
   */
  async remove(ctx) {
    const target = await strapi.db.query(USER_UID).findOne({
      where: { documentId: ctx.params.id, community: ctx.state.user.community.id },
    });

    if (!target) {
      throw new NotFoundError('Member not found');
    }

    if (Number(target.id) === Number(ctx.state.user.id)) {
      throw refuse('Use the leave endpoint to remove yourself from a community');
    }

    await detachFromCommunity(target.id);

    ctx.body = { removed: true };
  },
};
