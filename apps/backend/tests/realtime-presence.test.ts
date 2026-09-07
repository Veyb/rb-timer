// Covers the realtime half of specs/community-isolation: presence is scoped to
// the caller's own community, and identity is established by the server.
//
// Uses a real socket.io client, because the handshake is the thing under test.
// Asserting against the server's own API would skip exactly the step where a
// client used to be able to claim any identity it liked.
import type { Core } from '@strapi/strapi';
import { io as ioClient, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  createCommunity,
  createUser,
  findRole,
  setUserCommunity,
  type TestUser,
} from './helpers/fixtures';
import { cleanupStrapi, setupStrapi } from './helpers/strapi.cjs';

type Presence = Record<string, { id: number; nickname: string } | null>;

let strapi: Core.Strapi;
let baseUrl: string;
let viewerRoleId: number;

let alphaOne: TestUser;
let alphaTwo: TestUser;
let betaMember: TestUser;
let homeless: TestUser;

const open = (token?: string) =>
  ioClient(baseUrl, {
    transports: ['websocket'],
    forceNew: true,
    ...(token ? { auth: { token } } : {}),
  });

const sockets: Socket[] = [];

/**
 * A connection plus everything it has been sent.
 *
 * The buffer is attached before the socket connects on purpose: the server
 * emits a room's presence while handling the connection, so a listener added
 * after `connect()` resolves would miss the first payload. The real client
 * subscribes when its component mounts, independently of the handshake.
 */
interface TestSocket {
  socket: Socket;
  /** The next payload not yet read, or null if none arrives in time. */
  next: (timeoutMs?: number) => Promise<Presence | null>;
  /**
   * Every payload this connection has been sent, including any already read
   * through `next()`.
   *
   * Reading only the next one is not enough to claim isolation: a server that
   * scopes each payload's *contents* correctly but broadcasts it to everyone
   * would still deliver another community's presence as a later message, and a
   * test that looked at one payload would miss it.
   */
  all: () => Presence[];
}

const connect = async (token?: string): Promise<TestSocket> => {
  const socket = open(token);
  sockets.push(socket);

  // Two buffers on purpose: `unread` is a queue that `next()` consumes, while
  // `log` keeps everything ever delivered so `all()` can still see a payload
  // that was already read.
  const unread: Presence[] = [];
  const log: Presence[] = [];
  let notify: (() => void) | null = null;

  socket.on('socketUsers', ({ socketUsers }: { socketUsers: Presence }) => {
    unread.push(socketUsers);
    log.push(socketUsers);
    notify?.();
  });

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });

  const next = (timeoutMs = 800) =>
    new Promise<Presence | null>((resolve) => {
      if (unread.length > 0) return resolve(unread.shift() ?? null);

      const timer = setTimeout(() => {
        notify = null;
        resolve(null);
      }, timeoutMs);

      notify = () => {
        clearTimeout(timer);
        notify = null;
        resolve(unread.shift() ?? null);
      };
    });

  return { socket, next, all: () => [...log] };
};

const nicknamesIn = (presence: Presence | null) =>
  Object.values(presence ?? {})
    .filter((entry): entry is { id: number; nickname: string } => entry !== null)
    .map((entry) => entry.nickname);

beforeAll(async () => {
  ({ strapi, baseUrl } = await setupStrapi());

  viewerRoleId = (await findRole(strapi, 'viewer')).id;

  const alpha = await createCommunity(strapi, { name: 'Presence Alpha', server: 'Gamma' });
  const beta = await createCommunity(strapi, { name: 'Presence Beta', server: 'White' });

  alphaOne = await createUser(strapi, viewerRoleId);
  alphaTwo = await createUser(strapi, viewerRoleId);
  betaMember = await createUser(strapi, viewerRoleId);
  homeless = await createUser(strapi, viewerRoleId);

  await setUserCommunity(strapi, alphaOne.id, alpha.id);
  await setUserCommunity(strapi, alphaTwo.id, alpha.id);
  await setUserCommunity(strapi, betaMember.id, beta.id);
});

afterEach(() => {
  while (sockets.length > 0) sockets.pop()?.disconnect();
});

afterAll(async () => {
  await cleanupStrapi();
});

const nicknameOf = async (user: TestUser) => {
  const stored = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: user.id } });

  return stored.nickname;
};

describe('presence is scoped to the caller`s community', () => {
  it('shows a member their own community', async () => {
    const first = await connect(alphaOne.jwt);

    expect(nicknamesIn(await first.next())).toContain(await nicknameOf(alphaOne));
  });

  it('tells members of one community about each other', async () => {
    await connect(alphaOne.jwt);
    const second = await connect(alphaTwo.jwt);

    const nicknames = nicknamesIn(await second.next());
    expect(nicknames).toContain(await nicknameOf(alphaOne));
    expect(nicknames).toContain(await nicknameOf(alphaTwo));
  });

  it('never mentions a member of another community, in any payload', async () => {
    // Alpha connects first, so it is already listening when the other
    // community's traffic happens — that ordering is the whole test. The other
    // way round, a server broadcasting globally would still pass, because
    // beta's presence would have been sent before alpha was there to hear it.
    const alpha = await connect(alphaOne.jwt);
    await alpha.next();

    await connect(betaMember.jwt);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const seen = alpha.all().flatMap((payload) => nicknamesIn(payload));
    expect(seen).not.toContain(await nicknameOf(betaMember));
    expect(seen).toContain(await nicknameOf(alphaOne));
  });

  it('sends a member of another community nothing when one connects here', async () => {
    const beta = await connect(betaMember.jwt);
    await beta.next();

    const settled = beta.next();
    await connect(alphaOne.jwt);

    expect(await settled).toBeNull();
  });
});

describe('a connection with no community takes part in no presence', () => {
  it('receives nothing itself', async () => {
    const homelessSocket = await connect(homeless.jwt);

    expect(await homelessSocket.next()).toBeNull();
  });

  it('appears in nobody else`s presence', async () => {
    const member = await connect(alphaOne.jwt);
    await member.next();

    const settled = member.next();
    await connect(homeless.jwt);

    // Either no update at all, or one that does not mention them.
    expect(nicknamesIn(await settled)).not.toContain(await nicknameOf(homeless));
  });

  it('applies to an anonymous connection too', async () => {
    const anonymous = await connect();

    expect(await anonymous.next()).toBeNull();
  });
});

describe('identity comes from the server, not from the client', () => {
  it('ignores an identity a client announces after connecting', async () => {
    const anonymous = await connect();

    // These are the events the old implementation trusted verbatim.
    anonymous.socket.emit('auth', { user: { id: alphaOne.id, nickname: 'Impostor' } });
    anonymous.socket.emit('join', { user: { id: alphaOne.id, nickname: 'Impostor' } });

    expect(await anonymous.next()).toBeNull();

    const member = await connect(alphaOne.jwt);
    expect(nicknamesIn(await member.next())).not.toContain('Impostor');
  });

  it('treats a forged token as anonymous', async () => {
    const forged = await connect('not.a.real.token');

    expect(await forged.next()).toBeNull();
  });

  it('reports the nickname of record, whatever the client claims', async () => {
    const member = await connect(alphaOne.jwt);
    const presence = await member.next();

    const entry = Object.values(presence ?? {}).find((value) => value !== null);
    expect(entry?.nickname).toBe(await nicknameOf(alphaOne));
    expect(entry?.id).toBe(alphaOne.id);
  });

  it('exposes nothing but an id and a nickname', async () => {
    const member = await connect(alphaOne.jwt);
    const presence = await member.next();

    const entry = Object.values(presence ?? {}).find((value) => value !== null);
    expect(Object.keys(entry ?? {}).sort()).toEqual(['id', 'nickname']);
  });
});

describe('no client can disconnect the server', () => {
  it('ignores the withdrawn reset event', async () => {
    const member = await connect(alphaOne.jwt);
    await member.next();

    const attacker = await connect();
    attacker.socket.emit('reset');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(member.socket.connected).toBe(true);
  });
});
