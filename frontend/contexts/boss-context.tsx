'use client';

// global modules
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// local modules
import { Boss } from '../types';
import { getBossList } from '../lib/api';
import { sortBossList } from '../lib/utils';
import { useAuthContext } from './auth-context';
import { socket } from '../lib/web-sockets';

const BossContext = createContext<{
  bossList: Boss[];
  updateBossInList: (boss: Boss, autoUpdate?: boolean) => void;
}>({
  bossList: [],
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

  const updateBossInList = useCallback(
    (boss: Boss, autoUpdate?: boolean) => {
      clearTimeout(timer.current);
      const index = bossList.findIndex(
        ({ documentId }) => documentId === boss.documentId
      );
      const nextBossList = [...bossList];
      nextBossList[index] = boss;

      if (autoUpdate) {
        timer.current = setTimeout(() => {
          setBossList(sortBossList(nextBossList));
        }, 1000);
      } else {
        setBossList(sortBossList(nextBossList));
      }

      return () => clearTimeout(timer.current);
    },
    [bossList]
  );

  useEffect(() => {
    if (!auth.allowed) return () => clearInterval(refetchTimer);

    const refetchTimer = setInterval(() => {
      getBossList(auth.accessToken)
        .then((data) => {
          setBossList(data);
        })
        .catch((err: any) => {
          console.warn(err.response?.data.error);
        });
    }, 10000);

    return () => clearInterval(refetchTimer);
  }, [auth.allowed, auth.accessToken]);

  // socket
  // useEffect(() => {
  //   const connect = () => console.log('CONNECT');
  //   const disconnect = (reason: string) => console.log('DISCONNECT', reason);

  //   socket.on('connect', connect);
  //   socket.on('disconnect', disconnect);

  //   return () => {
  //     socket.off('connect', connect);
  //     socket.off('disconnect', disconnect);
  //   };
  // }, []);

  return (
    <BossContext.Provider value={{ bossList, updateBossInList }}>
      {children}
    </BossContext.Provider>
  );
};

export const useBossContext = () => useContext(BossContext);
