import { ensureInviteCodeIndex } from './helpers/ensure-invite-code-index';
import { setUpRealtime } from './helpers/realtime';
import { seedDefaultCommunity } from './helpers/seed-default-community';
import { seedRolesAndPermissions } from './helpers/seed-roles-and-permissions';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const DONATION_UID = 'api::donation.donation';
    const DONATION_WRITE_ACTIONS = [
      'create',
      'update',
      'delete',
      'publish',
      'unpublish',
      'discardDraft',
    ];

    strapi.documents.use(async (context, next) => {
      const result = await next();

      if (context.uid === DONATION_UID && DONATION_WRITE_ACTIONS.includes(context.action)) {
        const donations = await strapi.documents(DONATION_UID).findMany({
          status: 'published',
        });
        strapi.io.emit('newDonations', donations);
      }

      return result;
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Reconciles roles and their permissions to the declaration in code. Runs
    // after the plugin bootstraps, so it has the last word over the plugin's
    // own `syncPermissions`.
    await seedRolesAndPermissions({ strapi });

    // Runs after `schema.sync()`, which is the only point at which the
    // `communities` table exists — see the note in the helper for why this is
    // not a migration under `database/migrations/`.
    await seedDefaultCommunity({ strapi });

    // Also after `schema.sync()`, and for the same reason: the table it indexes
    // is created there.
    await ensureInviteCodeIndex({ strapi });

    setUpRealtime({ strapi });
  },
};
