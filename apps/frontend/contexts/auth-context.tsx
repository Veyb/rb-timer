'use client';

// global modules
import axios from 'axios';
import { destroyCookie, setCookie } from 'nookies';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiPost, getUsersMe } from '../lib/api';
// local modules
import { connectSocket, socket } from '../lib/web-sockets';
import type { User } from '../types';

/**
 * How the session cookie is written.
 *
 * `secure` outside development, so the token is never sent over plain http.
 * Not in development, where the app is served over http and the flag would
 * stop the cookie being set at all.
 *
 * `sameSite: 'lax'` and deliberately not `strict`. Strict withholds the cookie
 * on a cross-site navigation, and an invite link is exactly that — followed
 * from a chat message. A signed-in member opening `/join?code=…` would be
 * served the page as a stranger and told to log in.
 *
 * What this does not fix: the cookie is written from the browser, so it cannot
 * be `httpOnly`, and the client reads it back to sign every API call. Any
 * script on the page can take the session. Closing that means moving the API
 * calls to the server, which is its own change.
 */
const SESSION_COOKIE = {
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

const INVALID_USERNAME_EMAIL = 'Недопустимый формат e-mail.';
const EMAIL_IS_ALREADY_TAKEN = 'Данный e-mail уже зарегистрирован.';
const INVALID_CREDENTIALS_EMAIL =
  'Указан неправильный username или пароль. Проверьте правильность введенных данных.';

interface StrapiErrorResponse {
  error: {
    status: number;
    name: string;
    message: string;
    details?: unknown;
  };
}

interface LoginCredentials {
  identifier: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  nickname: string;
  realname: string;
}

function getErrorMessage(error: { message: string }) {
  switch (error.message) {
    case 'Invalid identifier or password':
      return INVALID_CREDENTIALS_EMAIL;
    case 'email must be a valid email':
      return INVALID_USERNAME_EMAIL;
    case 'Email is already taken':
      return EMAIL_IS_ALREADY_TAKEN;
    default:
      return error.message;
  }
}

const AuthContext = createContext<{
  user: User | null;
  loggedIn: boolean;
  hasCommunity: boolean;
  allowed: boolean;
  allowedUpdate: boolean;
  allowedManage: boolean;
  accessToken: string | undefined;
  login: (userData: LoginCredentials) => void;
  register: (userData: RegisterData) => void;
  logout: () => void;
}>({
  user: null,
  loggedIn: false,
  hasCommunity: false,
  allowed: false,
  allowedUpdate: false,
  allowedManage: false,
  accessToken: undefined,
  login: () => {},
  register: () => {},
  logout: () => {},
});

interface AuthContextProviderProps {
  user: User | null;
  jwt: string | undefined;
  children: ReactNode;
}

export const AuthContextProvider = ({
  user: propsUser,
  jwt,
  children,
}: AuthContextProviderProps) => {
  const [user, setUser] = useState(propsUser);
  const [accessToken, setAccessToken] = useState(jwt);
  const loggedIn = !!user;

  // Access now turns on two independent axes: belonging to a community, and
  // holding a role above the one registration grants. Failing either shows a
  // placeholder — a different one for each, since the way out differs: an
  // invite code for the first, an officer of your own community for the second.
  const hasCommunity = !!user?.community;
  const allowed = useMemo(
    () =>
      hasCommunity &&
      (user?.role.type === 'editor' ||
        user?.role.type === 'viewer' ||
        user?.role.type === 'officer'),
    [hasCommunity, user],
  );
  const allowedUpdate = useMemo(
    () => hasCommunity && (user?.role.type === 'editor' || user?.role.type === 'officer'),
    [hasCommunity, user],
  );
  const allowedManage = useMemo(
    () => hasCommunity && user?.role.type === 'officer',
    [hasCommunity, user],
  );

  const login = useCallback(async (userData: LoginCredentials) => {
    try {
      const loginResponse = await apiPost('/auth/local', userData);

      setCookie(null, 'jwt', loginResponse.jwt, SESSION_COOKIE);

      const userResponse = await getUsersMe(loginResponse.jwt);

      setUser(userResponse);
      setAccessToken(loginResponse.jwt);
    } catch (err) {
      if (!axios.isAxiosError<StrapiErrorResponse>(err) || !err.response) throw err;
      throw new Error(getErrorMessage(err.response.data.error));
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      const registerResponse = await apiPost('/auth/local/register', userData);

      setCookie(null, 'jwt', registerResponse.jwt, SESSION_COOKIE);

      setUser(await getUsersMe(registerResponse.jwt));
      setAccessToken(registerResponse.jwt);
    } catch (err) {
      if (!axios.isAxiosError<StrapiErrorResponse>(err) || !err.response) throw err;
      const error = err.response.data.error;
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const logout = useCallback(() => {
    destroyCookie(null, 'jwt', { path: '/' });
    setUser(null);
    setAccessToken(undefined);
  }, []);

  // The handshake carries the identity, so the connection is re-made whenever
  // the token changes — signing in, signing out, or a session that ended.
  useEffect(() => {
    connectSocket(accessToken);

    const reconnect = (reason: string) => {
      if (reason === 'io server disconnect') connectSocket(accessToken);
    };

    socket.on('disconnect', reconnect);

    return () => {
      socket.off('disconnect', reconnect);
    };
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loggedIn,
        accessToken,
        hasCommunity,
        allowed,
        allowedUpdate,
        allowedManage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
