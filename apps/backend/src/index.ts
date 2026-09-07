import { seedDefaultCommunity } from './helpers/seed-default-community';

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
    // Runs after `schema.sync()`, which is the only point at which the
    // `communities` table exists — see the note in the helper for why this is
    // not a migration under `database/migrations/`.
    await seedDefaultCommunity({ strapi });

    const socketUsers: Record<string, unknown> = {};
    // Same env var and format as config/middlewares.ts's `strapi::cors` origin
    // (comma-separated, e.g. "https://example.com,https://www.example.com").
    const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const io = require('socket.io')(strapi.server.httpServer, {
      cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      socket.on('join', ({ user }) => {
        socketUsers[socket.id] = user;
        io.emit('socketUsers', { socketUsers });
      });

      socket.on('auth', ({ user }) => {
        socketUsers[socket.id] = user;
        io.emit('socketUsers', { socketUsers });
      });

      socket.on('disconnect', (_reason) => {
        delete socketUsers[socket.id];
        io.emit('socketUsers', { socketUsers });
      });

      socket.on('reset', () => {
        io.disconnectSockets();
      });
    });

    strapi.io = io;
  },
};
