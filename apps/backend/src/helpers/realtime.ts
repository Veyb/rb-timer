/**
 * The socket.io server, and the two guarantees it has to keep.
 *
 * Before this, presence worked entirely on trust: a client emitted
 * `auth`/`join` with whatever `{ user }` it liked and the server stored it, so
 * a connection could claim to be anyone. And the resulting map lived in one
 * global object broadcast with `io.emit`, meaning every connected client — any
 * community, or none — received the nickname of everyone online.
 *
 * So identity comes from a verified token during the handshake and nowhere
 * else, and presence is confined to a room per community. There is no shared
 * map any more either: the room's own membership *is* the state, read back
 * with `fetchSockets()`, which removes the class of bug where the map and the
 * connections disagree.
 *
 * `newDonations` stays a global broadcast. Donations belong to the project
 * rather than to any community.
 */

const USER_UID = 'plugin::users-permissions.user';

const roomFor = (communityId: number | string) => `community:${communityId}`;

/** What a member may know about another member who is online. */
// Named by `documentId`, like every other document this API hands out: the
// numeric key is the database's and does not leave it. Here it is only an
// identity to group a person's several connections under, never an address.
type PresenceUser = { documentId: string; nickname: string };

/**
 * Resolves the connection's identity from its handshake token.
 *
 * A missing or invalid token is not an error: an anonymous visitor still needs
 * the donation feed. It simply yields no identity, and an identity is what
 * joins a presence room.
 */
const identify = async (token: unknown) => {
  if (typeof token !== 'string' || token.length === 0) return null;

  try {
    const payload = await strapi.plugin('users-permissions').service('jwt').verify(token);

    if (payload?.id === undefined) return null;

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: payload.id },
      populate: { community: true },
    });

    if (!user || user.blocked) return null;

    return {
      user: { documentId: user.documentId, nickname: user.nickname } satisfies PresenceUser,
      communityId: user.community?.id ?? null,
    };
  } catch {
    // A stale cookie is ordinary; the connection continues as anonymous.
    return null;
  }
};

export const setUpRealtime = ({ strapi }) => {
  // Same env var and format as config/middlewares.ts's `strapi::cors` origin
  // (comma-separated, e.g. "https://example.com,https://www.example.com").
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const io = require('socket.io')(strapi.server.httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const identity = await identify(socket.handshake.auth?.token);

    // Read-only from here on. Nothing a client sends can change it, which is
    // the whole point — the old `auth` and `join` events are gone.
    socket.data.presence = identity?.user ?? null;
    socket.data.communityId = identity?.communityId ?? null;

    next();
  });

  /**
   * Sends one community its own presence, and only its own. Built from the
   * room's live membership rather than a map kept alongside it.
   */
  const emitPresence = async (communityId: number | string) => {
    const room = roomFor(communityId);
    const sockets = await io.in(room).fetchSockets();

    const socketUsers = Object.fromEntries(
      sockets.map((member) => [member.id, member.data.presence ?? null]),
    );

    io.to(room).emit('socketUsers', { socketUsers });
  };

  io.on('connection', (socket) => {
    const { communityId } = socket.data;

    // No community, no room: such a connection receives no presence data and
    // appears in nobody else's.
    if (communityId !== null) {
      socket.join(roomFor(communityId));
      void emitPresence(communityId);
    }

    socket.on('disconnect', () => {
      if (communityId !== null) void emitPresence(communityId);
    });
  });

  // The `reset` event that used to live here called `io.disconnectSockets()`,
  // so any client could drop every connection on the server. Nothing emitted
  // it; it is gone rather than restricted.

  strapi.io = io;

  return io;
};
