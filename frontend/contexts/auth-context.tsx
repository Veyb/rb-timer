// global modules
import { destroyCookie, setCookie } from 'nookies';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// local modules
import { socket } from '../lib/web-sockets';
import { SocketUser, User } from '../types';
import { apiGet, getUsersMe, apiPost } from '../lib/api';

const INVALID_USERNAME_EMAIL = 'Недопустимый формат e-mail.';
const EMAIL_IS_ALREADY_TAKEN = 'Данный e-mail уже зарегистрирован.';
const INVALID_CREDENTIALS_EMAIL =
  'Указан неправильный username или пароль. Проверьте правильность введенных данных.';

function getErrorMessage(error: any) {
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
  allowed: boolean;
  allowedUpdate: boolean;
  allowedAdminister: boolean;
  accessToken: string | undefined;
  login: (userData: any) => void;
  register: (userData: any) => void;
  logout: () => void;
}>({
  user: null,
  loggedIn: false,
  allowed: false,
  allowedUpdate: false,
  allowedAdminister: false,
  accessToken: undefined,
  login: (userData: any) => {},
  register: (userData: any) => {},
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
  const [loggedIn, setLoggedIn] = useState(!!user);
  const allowed = useMemo(
    () =>
      user?.role.type === 'editor' ||
      user?.role.type === 'viewer' ||
      user?.role.type === 'officer',
    [user]
  );
  const allowedUpdate = useMemo(
    () => user?.role.type === 'editor' || user?.role.type === 'officer',
    [user]
  );
  const allowedAdminister = useMemo(
    () => user?.role.type === 'officer',
    [user]
  );

  const login = useCallback(async (userData) => {
    try {
      const loginResponse = await apiPost('/auth/local', userData);

      setCookie(null, 'jwt', loginResponse.jwt, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const userResponse = await getUsersMe(loginResponse.jwt);

      setUser(userResponse);
      setLoggedIn(!!userResponse);
      setAccessToken(loginResponse.jwt);
      socket.emit('auth', { user: getSocketUser(userResponse) });
    } catch (err: any) {
      const error = err.response.data.error;
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const register = useCallback(async (userData) => {
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
      setLoggedIn(!!userResponse);
      setAccessToken(registerResponse.jwt);
      socket.emit('auth', { user: getSocketUser(userResponse) });
    } catch (err: any) {
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

  useEffect(() => {
    setLoggedIn(!!user);
  }, [user]);

  // socket
  useEffect(() => {
    const socketUserJoin = () =>
      socket.emit('join', { user: getSocketUser(user) });

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
