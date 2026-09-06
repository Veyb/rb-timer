import { errors, validateYupSchema, yup } from '@strapi/utils';

const { ValidationError, ApplicationError } = errors;

const USER_UID = 'plugin::users-permissions.user';

const hasOwn = (object: object, key: string) => Object.hasOwn(object, key);

type AdvancedSettings = { unique_email?: boolean };

const updateUserBodySchema = yup.object().shape({
  email: yup.string().email().min(1),
  username: yup.string().min(1),
  password: yup.string().min(1),
});
const validateUpdateUserBody = validateYupSchema(updateUserBodySchema);

export default (plugin) => {
  const getUserService = () => strapi.plugin('users-permissions').service('user');

  const sanitizeOutput = (user) => {
    const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user; // be careful, you need to omit other private attributes yourself
    return sanitizedUser;
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

  plugin.controllers.user.update = async (ctx) => {
    const advancedConfigs = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id },
      populate: ['role'],
    });

    await validateUpdateUserBody(ctx.request.body);

    if (user.provider === 'local' && hasOwn(ctx.request.body, 'password') && !password) {
      throw new ValidationError('password.notNull');
    }

    if (hasOwn(ctx.request.body, 'username')) {
      const userWithSameUsername = await strapi.db.query(USER_UID).findOne({ where: { username } });

      if (userWithSameUsername && Number(userWithSameUsername.id) !== Number(id)) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (hasOwn(ctx.request.body, 'email') && (advancedConfigs as AdvancedSettings).unique_email) {
      const userWithSameEmail = await strapi.db
        .query(USER_UID)
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && Number(userWithSameEmail.id) !== Number(id)) {
        throw new ApplicationError('Email already taken');
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    const updateData = {
      ...ctx.request.body,
    };

    // getUserService().edit() resolves the numeric id to a documentId and
    // updates via the Document Service, which hashes `password` itself.
    const data = await getUserService().edit(id, updateData);

    const sanitizedData = await sanitizeOutput(data);

    ctx.send(sanitizedData);
  };

  // Create the new controller
  plugin.controllers.user.updateMe = async (ctx) => {
    const advancedConfigs = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const { id } = ctx.state.user;
    const { email, username, password } = ctx.request.body;

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id },
      populate: ['role'],
    });

    await validateUpdateUserBody(ctx.request.body);

    if (user.provider === 'local' && hasOwn(ctx.request.body, 'password') && !password) {
      throw new ValidationError('password.notNull');
    }

    if (hasOwn(ctx.request.body, 'username')) {
      const userWithSameUsername = await strapi.db.query(USER_UID).findOne({ where: { username } });

      if (userWithSameUsername && Number(userWithSameUsername.id) !== Number(id)) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (hasOwn(ctx.request.body, 'email') && (advancedConfigs as AdvancedSettings).unique_email) {
      const userWithSameEmail = await strapi.db
        .query(USER_UID)
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && Number(userWithSameEmail.id) !== Number(id)) {
        throw new ApplicationError('Email already taken');
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    const updateData = {
      ...ctx.request.body,
    };

    // getUserService().edit() resolves the numeric id to a documentId and
    // updates via the Document Service, which hashes `password` itself.
    const data = await getUserService().edit(id, updateData);

    const sanitizedData = await sanitizeOutput(data);

    ctx.send(sanitizedData);
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
