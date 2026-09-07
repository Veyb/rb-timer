import io from 'socket.io-client';
import { SOCKET_URL } from './api';

/**
 * The server reads this connection's identity from the handshake token and
 * from nowhere else. Emitting `{ user }` after connecting — which is what this
 * app used to do — let a client claim to be anyone, and put every nickname
 * online into one broadcast that reached every community.
 *
 * So the socket does not connect on import: it waits until the token is known.
 */
export const socket = io(SOCKET_URL, {
  secure: true,
  withCredentials: true,
  autoConnect: false,
});

/**
 * (Re)connects carrying `token`. Signing in, signing out and leaving a
 * community all change who the connection belongs to, and the only way to tell
 * the server is a fresh handshake.
 */
export const connectSocket = (token: string | undefined) => {
  socket.auth = token ? { token } : {};

  if (socket.connected) socket.disconnect();

  socket.connect();
};
