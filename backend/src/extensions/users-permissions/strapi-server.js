const _ = require("lodash");
const { yup, validateYupSchema } = require("@strapi/utils");

const updateUserBodySchema = yup.object().shape({
  email: yup.string().email().min(1),
  username: yup.string().min(1),
  password: yup.string().min(1),
});
const validateUpdateUserBody = validateYupSchema(updateUserBodySchema);

module.exports = (plugin) => {
  const sanitizeOutput = (user) => {
    const {
      password,
      resetPasswordToken,
      confirmationToken,
      ...sanitizedUser
    } = user; // be careful, you need to omit other private attributes yourself
    return sanitizedUser;
  };

  plugin.controllers.user.me = async (ctx) => {
    if (!ctx.state.user) {
      return ctx.unauthorized();
    }
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      ctx.state.user.id,
      { populate: ["role"] }
    );

    ctx.body = sanitizeOutput(user);
  };

  plugin.controllers.user.find = async (ctx) => {
    const users = await strapi.entityService.findMany(
      "plugin::users-permissions.user",
      { ...ctx.params, populate: ["role"] }
    );

    ctx.body = users.map((user) => sanitizeOutput(user));
  };

  // Create the new controller
  plugin.controllers.user.updateMe = async (ctx) => {
    const advancedConfigs = await strapi
      .store({ type: "plugin", name: "users-permissions", key: "advanced" })
      .get();

    const { id } = ctx.state.user;
    const { email, username, password } = ctx.request.body;

    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      id,
      { populate: ["role"] }
    );

    await validateUpdateUserBody(ctx.request.body);

    if (
      user.provider === "local" &&
      _.has(ctx.request.body, "password") &&
      !password
    ) {
      throw new ValidationError("password.notNull");
    }

    if (_.has(ctx.request.body, "username")) {
      const userWithSameUsername = await strapi
        .query("plugin::users-permissions.user")
        .findOne({ where: { username } });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        throw new ApplicationError("Username already taken");
      }
    }

    if (_.has(ctx.request.body, "email") && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query("plugin::users-permissions.user")
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        throw new ApplicationError("Email already taken");
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    let updateData = {
      ...ctx.request.body,
    };

    const data = await strapi.entityService.update(
      "plugin::users-permissions.user",
      id,
      {
        data: updateData,
        populate: ["role"],
      }
    );

    const sanitizedData = await sanitizeOutput(data, ctx);

    ctx.send(sanitizedData);
  };

  // Add the custom route
  plugin.routes["content-api"].routes.unshift({
    method: "PUT",
    path: "/users/me",
    handler: "user.updateMe",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
