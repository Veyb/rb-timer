import { errors, validateYupSchema, yup } from '@strapi/utils';

const { ValidationError, ApplicationError } = errors;

const USER_UID = 'plugin::users-permissions.user';

const hasOwn = (object: object, key: string) => Object.hasOwn(object, key);

type AdvancedSettings = { unique_email?: boolean };

// `getUserService().edit()` forwards whatever object it is handed straight to
// the Document Service, which writes any attribute of the user model. So these
// schemas are the allowlist, not just a shape check: every handler below must
// pass the *validated* result on, never `ctx.request.body`. `validateYupSchema`
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

// A relation accepts either the numeric id (what the frontend sends) or the
// documentId. Object forms (`{ connect: [...] }`) are refused: this path exists
// only to set one role by id.
const roleIdSchema = yup
  .mixed()
  .test(
    'role-id',
    'role must be a role id',
    (value) => value === undefined || typeof value === 'number' || typeof value === 'string',
  );

// Own account: profile attributes only. `role` and `community` are privileged
// and are never settable from a request body.
const updateMeBodySchema = yup.object().shape(profileAttributes).noUnknown();
const validateUpdateMeBody = validateYupSchema(updateMeBodySchema);

// Operator path (`PUT /users/:id`), which additionally carries `role`. The
// community-architecture change revokes this route in its isolation stage, in
// favour of a member endpoint that changes nothing but the role.
const updateUserBodySchema = yup
  .object()
  .shape({ ...profileAttributes, role: roleIdSchema })
  .noUnknown();
const validateUpdateUserBody = validateYupSchema(updateUserBodySchema);

export default (plugin) => {
  const getUserService = () => strapi.plugin('users-permissions').service('user');

  const sanitizeOutput = (user) => {
    const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user; // be careful, you need to omit other private attributes yourself
    return sanitizedUser;
  };

  // Shared by `PUT /users/:id` and `PUT /users/me`, which differ only in whose
  // account they address and whether `role` is on the allowlist. One body keeps
  // the allowlist from being enforced on one path and forgotten on the other.
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
      populate: ['role'],
    });

    ctx.body = sanitizeOutput(user);
  };

  plugin.controllers.user.find = async (ctx) => {
    const users = await strapi.db.query(USER_UID).findMany({ ...ctx.params, populate: ['role'] });

    ctx.body = users.map((user) => sanitizeOutput(user));
  };

  plugin.controllers.user.findOne = async (ctx) => {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: ctx.params.id },
      ...ctx.params,
      populate: ['role'],
    });

    ctx.body = sanitizeOutput(user);
  };

  // Operator path: `role` is on the allowlist here and nowhere else.
  plugin.controllers.user.update = async (ctx) => {
    await editUser(ctx, ctx.params.id, validateUpdateUserBody);
  };

  // Own account: profile attributes only, so no request body can grant its
  // sender a role or a community.
  plugin.controllers.user.updateMe = async (ctx) => {
    await editUser(ctx, ctx.state.user.id, validateUpdateMeBody);
  };

  // Add the custom route
  plugin.routes['content-api'].routes.unshift({
    method: 'PUT',
    path: '/users/me',
    handler: 'user.updateMe',
    config: {
      prefix: '',
    },
  });

  return plugin;
};
