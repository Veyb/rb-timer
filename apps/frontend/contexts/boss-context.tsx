'use client';

// global modules
import axios from 'axios';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getBossList } from '../lib/api';
import { sortBossList } from '../lib/utils';
// local modules
import type { Boss } from '../types';
import { useAuthContext } from './auth-context';

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

export const BossContextProvider = ({ children, bossList: list }: BossContextProviderProps) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const auth = useAuthContext();
  const [bossList, setBossList] = useState<Boss[]>(list);

  const updateBossInList = useCallback(
    (boss: Boss, autoUpdate?: boolean) => {
      clearTimeout(timer.current ?? undefined);
      const index = bossList.findIndex(({ documentId }) => documentId === boss.documentId);
      const nextBossList = [...bossList];
      nextBossList[index] = boss;

      if (autoUpdate) {
        timer.current = setTimeout(() => {
          setBossList(sortBossList(nextBossList));
        }, 1000);
      } else {
        setBossList(sortBossList(nextBossList));
      }

      return () => clearTimeout(timer.current ?? undefined);
    },
    [bossList],
  );

  useEffect(() => {
    if (!auth.allowed) return () => clearInterval(refetchTimer);

    const refetchTimer = setInterval(() => {
      getBossList(auth.accessToken)
        .then((data) => {
          setBossList(data);
        })
        .catch((err) => {
          console.warn(axios.isAxiosError(err) ? err.response?.data.error : err);
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
    <BossContext.Provider value={{ bossList, updateBossInList }}>{children}</BossContext.Provider>
  );
};

export const useBossContext = () => useContext(BossContext);
