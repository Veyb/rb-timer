// global modules
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getBossList } from '../lib/api';

// local modules
import { Boss } from '../types';
import { sortBossList } from '../lib/utils';
import { useAuthContext } from './auth-context';

const BossContext = createContext<{
  bossList: Boss[];
  allowed: boolean;
  allowedUpdate: boolean;
  updateBossInList: (boss: Boss, autoUpdate?: boolean) => void;
}>({
  bossList: [],
  allowed: false,
  allowedUpdate: false,
  updateBossInList: () => {},
});

interface BossContextProviderProps {
  children: ReactNode;
  bossList: Boss[];
}

export const BossContextProvider = ({
  children,
  bossList: list,
}: BossContextProviderProps) => {
  let timer: any = useRef(null);
  const auth = useAuthContext();
  const [bossList, setBossList] = useState<Boss[]>(list);
  const newBossList = useMemo(() => [...bossList], [bossList]);
  const allowed = useMemo(
    () =>
      auth.user?.role.type === 'editor' || auth.user?.role.type === 'viewer',
    [auth.user]
  );
  const allowedUpdate = useMemo(
    () => auth.user?.role.type === 'editor',
    [auth.user]
  );

  const updateBossInList = useCallback(
    (boss: Boss, autoUpdate?: boolean) => {
      clearTimeout(timer.current);
      const index = bossList.findIndex(({ id }) => id === boss.id);
      newBossList[index] = boss;

      if (autoUpdate) {
        timer.current = setTimeout(() => {
          setBossList(sortBossList(newBossList));
        }, 1000);
      } else {
        setBossList(sortBossList(newBossList));
      }

      return () => clearTimeout(timer.current);
    },
    [bossList, newBossList]
  );

  useEffect(() => {
    if (!allowed) return () => clearInterval(refetchTimer);

    const refetchTimer = setInterval(() => {
      getBossList(auth.accessToken)
        .then((data) => {
          setBossList(data);
        })
        .catch((err: any) => {
          console.warn(err.response.data.error);
        });
    }, 10000);

    return () => clearInterval(refetchTimer);
  }, [allowed, auth.accessToken]);

  return (
    <BossContext.Provider
      value={{ bossList, updateBossInList, allowed, allowedUpdate }}
    >
      {children}
    </BossContext.Provider>
  );
};

export const useBossContext = () => useContext(BossContext);
