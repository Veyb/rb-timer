// global modules
import { destroyCookie, setCookie } from 'nookies';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

// local modules
import { get, post } from '../lib/api';

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
  user: any | null;
  loggedIn: boolean;
  accessToken: string | undefined;
  login: (userData: any) => void;
  register: (userData: any) => void;
  logout: () => void;
}>({
  user: null,
  loggedIn: false,
  accessToken: undefined,
  login: (userData: any) => {},
  register: (userData: any) => {},
  logout: () => {},
});

interface AuthContextProviderProps {
  user: any;
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
  const [loggedIn, setLoggedIn] = useState(!!user);

  const login = useCallback(async (userData) => {
    try {
      const loginResponse = await post('/auth/local', userData);

      setCookie(null, 'jwt', loginResponse.jwt, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const userResponse = await get('/users/me', {
        headers: {
          Authorization: `Bearer ${loginResponse.jwt}`,
        },
      });

      setUser(userResponse);
      setLoggedIn(!!userResponse);
      setAccessToken(loginResponse.jwt);
    } catch (err: any) {
      const error = err.response.data.error;
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const registerResponse = await post('/auth/local/register', userData);

      setCookie(null, 'jwt', registerResponse.jwt, {
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      const userResponse = await get('/users/me', {
        headers: {
          Authorization: `Bearer ${registerResponse.jwt}`,
        },
      });

      setUser(userResponse);
      setLoggedIn(!!userResponse);
      setAccessToken(registerResponse.jwt);
    } catch (err: any) {
      const error = err.response.data.error;
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const logout = useCallback(() => {
    destroyCookie(null, 'jwt');
    setUser(null);
    setAccessToken(undefined);
  }, []);

  useEffect(() => {
    setLoggedIn(!!user);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, loggedIn, accessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
