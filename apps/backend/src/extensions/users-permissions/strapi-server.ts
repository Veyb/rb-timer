import { errors, validateYupSchema, yup } from '@strapi/utils';

const { ValidationError, ApplicationError, PolicyError } = errors;

const USER_UID = 'plugin::users-permissions.user';

const hasOwn = (object: object, key: string) => Object.hasOwn(object, key);

type AdvancedSettings = { unique_email?: boolean };

// `getUserService().edit()` forwards whatever object it is handed straight to
// the Document Service, which writes any attribute of the user model. So this
// schema is the allowlist, not just a shape check, and the handler must pass
// the *validated* result on, never `ctx.request.body`. `validateYupSchema`
// runs yup with `{ strict: true }`, under which `.noUnknown()` rejects an
// unexpected key instead of silently dropping it — a client sending `role` to
// its own account is either a defect or an escalation attempt, and silence
// would hide both.
const profileAttributes = {
  email: yup.string().email().min(1),
  username: yup.string().min(1),
  password: yup.string().min(1),
  nickname: yup.string().min(1),
  realname: yup.string().min(1),
  collections: yup.object().nullable(),
};

// Own account: profile attributes only. `role` and `community` are privileged
// and are never settable from a request body.
const updateMeBodySchema = yup.object().shape(profileAttributes).noUnknown();
const validateUpdateMeBody = validateYupSchema(updateMeBodySchema);

export default (plugin) => {
  const getUserService = () => strapi.plugin('users-permissions').service('user');

  // The plugin populates only `role` onto `ctx.state.user`, so `community`
  // would be undefined on every request and every policy or handler would have
  // to read it back itself — one forgetful path away from a leak. Populated
  // once here instead: it is the join that decides whether the app is
  // reachable and which members a caller may see.
  //
  // Note the wrapper. Unlike `plugin.controllers.*`, which are plain objects,
  // `plugin.services.*` are factories — assigning a property straight onto
  // `plugin.services.user` sets it on the function and is never read, which
  // fails silently and leaves every community-scoped policy refusing everyone.
  const createUserService = plugin.services.user;
  plugin.services.user = (params) => ({
    ...createUserService(params),
    fetchAuthenticatedUser: (id) =>
      strapi.db.query(USER_UID).findOne({
        where: { id },
        populate: { role: true, community: true },
      }),
  });

  const sanitizeOutput = (user) => {
    const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user; // be careful, you need to omit other private attributes yourself
    return sanitizedUser;
  };

  // Only `PUT /users/me` reaches this now; the operator path it used to share
  // with is gone, replaced by an endpoint that changes nothing but a role.
  const editUser = async (ctx, id, validateBody) => {
    const advancedConfigs = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()) as AdvancedSettings;

    // Validated first, and the *result* is what gets written: it holds only the
    // attributes the schema allows. `ctx.request.body` must not be read past
    // this line.
    const updateData = await validateBody(ctx.request.body);
    const { email, username, password } = updateData;

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id },
      populate: ['role'],
    });

    if (user.provider === 'local' && hasOwn(updateData, 'password') && !password) {
      throw new ValidationError('password.notNull');
    }

    if (hasOwn(updateData, 'username')) {
      const userWithSameUsername = await strapi.db.query(USER_UID).findOne({ where: { username } });

      if (userWithSameUsername && Number(userWithSameUsername.id) !== Number(id)) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (hasOwn(updateData, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi.db
        .query(USER_UID)
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && Number(userWithSameEmail.id) !== Number(id)) {
        throw new ApplicationError('Email already taken');
      }
      updateData.email = email.toLowerCase();
    }

    // getUserService().edit() resolves the numeric id to a documentId and
    // updates via the Document Service, which hashes `password` itself.
    const data = await getUserService().edit(id, updateData);

    ctx.send(sanitizeOutput(data));
  };

  plugin.controllers.user.me = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized();
    }
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.state.user.id },
      // A member reads their own community here, and nowhere else: the
      // community collection has no Content API route at all. The frontend
      // needs `name`, `server` and the logo to render the community, and the
      // membership itself decides whether the app is reachable.
      populate: { role: true, community: { populate: { logo: true } } },
    });

    ctx.body = sanitizeOutput(user);
  };

  // The general-purpose user endpoints answer with no community scope of any
  // kind: `find` returned every user in the database, `findOne` any user by
  // id, and `update`/`destroy`/`create` wrote any of them. `api::community-member`
  // replaces them with reads scoped to the caller's own community, and
  // `PUT /community/members/:id/role` replaces the operator path.
  //
  // Refused in code, not only left ungranted. The permission seeder already
  // withholds these actions on every boot, but that is one layer; a handler
  // that cannot serve a request is another, and it holds even if a permission
  // is granted by accident later. Replacing existing actions rather than
  // adding any keeps the set of grantable actions unchanged.
  for (const action of ['find', 'findOne', 'count', 'create', 'update', 'destroy']) {
    plugin.controllers.user[action] = async () => {
      // PolicyError rather than ForbiddenError: the authorize middleware
      // rewrites a handler's ForbiddenError into a bare "Forbidden", and a
      // caller deserves to be told where the data moved to.
      throw new PolicyError(
        'The user collection is not available through the Content API. Use /community/members.',
      );
    };
  }

  // Own account: profile attributes only, so no request body can grant its
  // sender a role or a community.
  plugin.controllers.user.updateMe = async (ctx) => {
    await editUser(ctx, ctx.state.user.id, validateUpdateMeBody);
  };

  /**
   * Deletes the caller's own account, and only ever the caller's.
   *
   * This is what replaces the withdrawn `DELETE /users/:id`, and the difference
   * is the whole point: there is no target to aim. Available to every signed-in
   * role, community or not — an account registered by mistake should not need
   * an administrator to undo.
   *
   * The membership goes with it: `up_users_community_lnk` cascades on delete.
   */
  plugin.controllers.user.deleteMe = async (ctx) => {
    const user = await strapi.db.query(USER_UID).findOne({ where: { id: ctx.state.user.id } });

    if (!user) {
      return ctx.unauthorized();
    }

    await strapi.documents(USER_UID).delete({ documentId: user.documentId });

    ctx.body = { deleted: true };
  };

  // Both before `/users/:id`, which would otherwise capture "me".
  plugin.routes['content-api'].routes.unshift(
    {
      method: 'PUT',
      path: '/users/me',
      handler: 'user.updateMe',
      config: {
        prefix: '',
      },
    },
    {
      method: 'DELETE',
      path: '/users/me',
      handler: 'user.deleteMe',
      config: {
        prefix: '',
      },
    },
  );

  return plugin;
};
