// global modules
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const ModalContext = createContext<{}>({});

interface AuthContextProviderProps {
  children: ReactNode;
}

export const ModalContextProvider = ({
  children,
}: AuthContextProviderProps) => {
  const [isModal, setModal] = useState(false);

  const open = useCallback(() => setModal(true), []);
  const close = useCallback(() => setModal(false), []);

  return (
    <ModalContext.Provider value={{ isModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalContext = () => useContext(ModalContext);
