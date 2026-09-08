/**
 * Declares the users-permissions roles and, for each, exactly which Content
 * API actions it may call — and reconciles the database to match on every
 * boot.
 *
 * Permissions live in `up_permissions`, not in the repository, so until now
 * the isolation guarantee rested on whatever had been ticked in the admin
 * panel of one particular database. That does not survive a fresh clone, a
 * test database, or a deploy, and "fail closed" cannot depend on an operator
 * remembering to untick a box. This file is the source of truth instead.
 *
 * Consequence worth knowing: editing these permissions in the admin panel no
 * longer sticks — the next boot reverts it. Change the declaration below.
 *
 * The reconciliation is authoritative for the roles it names and for those
 * roles only. A role added outside this list keeps whatever it has, and is
 * reported rather than silently emptied.
 */

const ROLE_UID = 'plugin::users-permissions.role';
const PERMISSION_UID = 'plugin::users-permissions.permission';

/** Readable data everyone signed in may see, whatever their community. */
const SHARED_CONTENT = [
  'api::boss.boss.find',
  'api::boss.boss.findOne',
  'api::collection.collection.find',
  'api::collection.collection.findOne',
  'api::effect.effect.find',
  'api::effect.effect.findOne',
  'api::item.item.find',
  'api::item.item.findOne',
];

/**
 * Own account. Self-scoped by construction — none of these takes a target — so
 * every signed-in role holds them, including the one registration grants:
 * an account created by mistake should not need an administrator to undo.
 */
const OWN_ACCOUNT = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.user.updateMe',
  'plugin::users-permissions.user.deleteMe',
];

/**
 * Members of one's own community. These replace `user.find` / `user.findOne`,
 * which are absent from every role below on purpose: the general-purpose user
 * endpoints answer with no community scope at all.
 */
const OWN_COMMUNITY_MEMBERS = [
  'api::community-member.community-member.find',
  'api::community-member.community-member.findOne',
  // Leaving takes no target either; the endpoint addresses the caller.
  'api::community-member.community-member.leave',
];

/**
 * Joining a community by code. Held by every signed-in role, not only the one
 * registration grants.
 *
 * Leaving or being removed puts a user back on the default role, so in the
 * normal course of things only that role ever needs this. But an operator can
 * assign a role in the admin panel without assigning a community — the e2e
 * fixtures model exactly that account — and the frontend shows the
 * invite-code form to anyone without a community. Granting it only to the
 * default role would leave those accounts looking at a form that answers 403.
 *
 * It widens nothing: the handler refuses any caller who already belongs to a
 * community, so for an actual member the action is unreachable whether the
 * permission is held or not.
 */
const JOIN_BY_INVITE = ['api::invite-code.invite-code.redeem'];

/**
 * Issuing, listing and revoking the invite codes of one's own community.
 * Officers only — every handler behind these scopes to
 * `ctx.state.user.community`, and none of them is meaningful without it.
 */
const OWN_COMMUNITY_INVITES = [
  'api::invite-code.invite-code.create',
  'api::invite-code.invite-code.find',
  'api::invite-code.invite-code.revoke',
];

export const ROLES = [
  {
    type: 'public',
    name: 'Анонимный',
    description: 'Default role given to unauthenticated user.',
    actions: [
      'api::donation.donation.find',
      'plugin::users-permissions.auth.callback',
      'plugin::users-permissions.auth.connect',
      'plugin::users-permissions.auth.register',
      'plugin::users-permissions.user.me',
    ],
  },
  {
    type: 'authenticated',
    name: 'Бесправный',
    description: 'Default role given to authenticated user.',
    // What registration grants: enough to see the placeholder, read your own
    // account and delete it, and nothing of any community.
    actions: [
      ...JOIN_BY_INVITE,
      'api::donation.donation.find',
      'plugin::users-permissions.auth.connect',
      'plugin::users-permissions.user.me',
      'plugin::users-permissions.user.deleteMe',
    ],
  },
  {
    type: 'viewer',
    name: 'Наблюдатель',
    description: 'The user who can view data.',
    actions: [
      ...SHARED_CONTENT,
      ...OWN_ACCOUNT,
      ...OWN_COMMUNITY_MEMBERS,
      ...JOIN_BY_INVITE,
      'api::donation.donation.find',
      'plugin::users-permissions.auth.connect',
    ],
  },
  {
    type: 'editor',
    name: 'Редактор',
    description: 'The user who can edit data.',
    actions: [
      ...SHARED_CONTENT,
      ...OWN_ACCOUNT,
      ...OWN_COMMUNITY_MEMBERS,
      ...JOIN_BY_INVITE,
      'api::boss.boss.update',
      'api::donation.donation.find',
      'plugin::users-permissions.auth.connect',
    ],
  },
  {
    type: 'officer',
    name: 'Офицер',
    description: 'The user who can edit important data.',
    actions: [
      ...SHARED_CONTENT,
      ...OWN_ACCOUNT,
      ...OWN_COMMUNITY_MEMBERS,
      ...OWN_COMMUNITY_INVITES,
      ...JOIN_BY_INVITE,
      'api::boss.boss.update',
      'api::community-member.community-member.remove',
      'api::community-member.community-member.updateRole',
      'api::donation.donation.find',
      'plugin::users-permissions.auth.connect',
      // Reads the role list the member management screen offers.
      'plugin::users-permissions.role.find',
      'plugin::users-permissions.role.findOne',
    ],
  },
] as const;

/**
 * Never granted to any role. Listed so the intent is greppable and so the
 * reconciliation can report if one ever reappears: these are the endpoints
 * that answer without a community scope, and the reason the member API exists.
 */
export const NEVER_GRANTED = [
  'plugin::users-permissions.user.find',
  'plugin::users-permissions.user.findOne',
  'plugin::users-permissions.user.count',
  'plugin::users-permissions.user.create',
  'plugin::users-permissions.user.update',
  'plugin::users-permissions.user.destroy',
];

/**
 * Actions the plugin grants by default on a brand-new database that the
 * declaration above deliberately leaves out. Recorded because an authoritative
 * reconciliation revokes anything it does not name, and that has to be a
 * decision rather than an oversight — on a fresh install these would otherwise
 * disappear silently.
 *
 * None of them is reachable from this frontend, which calls only
 * `/auth/local` and `/auth/local/register`: sign-out just drops the cookie
 * client-side, a password is changed through `PUT /users/me`, there is no
 * password-reset or e-mail-confirmation screen, and refresh-mode sessions are
 * not configured. The existing deployment does not hold them either. Add the
 * relevant entry here the day a screen needs one.
 */
export const DELIBERATELY_NOT_GRANTED = [
  'plugin::users-permissions.auth.forgotPassword',
  'plugin::users-permissions.auth.resetPassword',
  'plugin::users-permissions.auth.changePassword',
  'plugin::users-permissions.auth.emailConfirmation',
  'plugin::users-permissions.auth.sendEmailConfirmation',
  'plugin::users-permissions.auth.refresh',
  'plugin::users-permissions.auth.logout',
  'plugin::users-permissions.auth.getSessions',
  'plugin::users-permissions.auth.revokeSession',
];

export const seedRolesAndPermissions = async ({ strapi }) => {
  const declaredTypes = ROLES.map((role) => role.type);
  const added: string[] = [];
  const removed: string[] = [];

  // An action the app does not expose cannot be granted: the plugin's own
  // `syncPermissions` deletes such rows on the next boot, so granting one here
  // would look like it worked and quietly vanish.
  const knownActions = new Set(strapi.contentAPI.permissions.providers.action.keys() as string[]);

  for (const declared of ROLES) {
    let role = await strapi.db.query(ROLE_UID).findOne({ where: { type: declared.type } });

    if (!role) {
      role = await strapi.db.query(ROLE_UID).create({
        data: { type: declared.type, name: declared.name, description: declared.description },
      });
      strapi.log.info(`Created users-permissions role "${declared.type}"`);
    }

    const wanted = new Set<string>(declared.actions);
    const unknown = [...wanted].filter((action) => !knownActions.has(action));

    if (unknown.length > 0) {
      strapi.log.warn(
        `Role "${declared.type}" declares unknown action(s): ${unknown.join(', ')} — not granted`,
      );
      for (const action of unknown) wanted.delete(action);
    }

    const existing = await strapi.db.query(PERMISSION_UID).findMany({
      where: { role: role.id },
    });

    for (const permission of existing) {
      if (!wanted.has(permission.action)) {
        await strapi.db.query(PERMISSION_UID).delete({ where: { id: permission.id } });
        removed.push(`${declared.type}: ${permission.action}`);
      }
    }

    const held = new Set(existing.map((permission) => permission.action));

    for (const action of wanted) {
      if (!held.has(action)) {
        await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
        added.push(`${declared.type}: ${action}`);
      }
    }
  }

  const undeclared = await strapi.db.query(ROLE_UID).findMany({
    where: { type: { $notIn: declaredTypes } },
  });

  if (undeclared.length > 0) {
    strapi.log.warn(
      `Roles outside seed-roles-and-permissions are left untouched: ${undeclared
        .map((role) => role.type)
        .join(', ')}`,
    );
  }

  if (added.length > 0) strapi.log.info(`Granted permissions:\n  ${added.join('\n  ')}`);
  if (removed.length > 0) strapi.log.info(`Revoked permissions:\n  ${removed.join('\n  ')}`);

  return { added, removed };
};
