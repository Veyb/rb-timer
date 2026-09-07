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
import { apiGet, apiPost, getUsersMe } from '../lib/api';
// local modules
import { socket } from '../lib/web-sockets';
import type { SocketUser, User } from '../types';

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
  allowedAdminister: boolean;
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
  allowedAdminister: false,
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

const getSocketUser = (user: User | null): SocketUser | null =>
  user ? { id: user.id, nickname: user.nickname } : user;

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
  const allowedAdminister = useMemo(
    () => hasCommunity && user?.role.type === 'officer',
    [hasCommunity, user],
  );

  const login = useCallback(async (userData: LoginCredentials) => {
    try {
      const loginResponse = await apiPost('/auth/local', userData);

      setCookie(null, 'jwt', loginResponse.jwt, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const userResponse = await getUsersMe(loginResponse.jwt);

      setUser(userResponse);
      setAccessToken(loginResponse.jwt);
      socket.emit('auth', { user: getSocketUser(userResponse) });
    } catch (err) {
      if (!axios.isAxiosError<StrapiErrorResponse>(err) || !err.response) throw err;
      throw new Error(getErrorMessage(err.response.data.error));
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      const registerResponse = await apiPost('/auth/local/register', userData);

      setCookie(null, 'jwt', registerResponse.jwt, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const userResponse = await apiGet('/users/me', {
        headers: {
          Authorization: `Bearer ${registerResponse.jwt}`,
        },
      });

      setUser(userResponse);
      setAccessToken(registerResponse.jwt);
      socket.emit('auth', { user: getSocketUser(userResponse) });
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
    socket.emit('auth', { user: null });
  }, []);

  // socket
  useEffect(() => {
    const socketUserJoin = () => socket.emit('join', { user: getSocketUser(user) });

    const disconnect = (reason: string) => {
      if (reason === 'io server disconnect') socket.connect();
    };

    socket.on('connect', socketUserJoin);
    socket.on('disconnect', disconnect);

    return () => {
      socket.off('connect', socketUserJoin);
      socket.off('disconnect', disconnect);
    };
  }, [user]);

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
        allowedAdminister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
