// global modules
import * as R from 'ramda';
import type { ReactNode } from 'react';
import {
  useMemo,
  useState,
  useContext,
  useCallback,
  createContext,
} from 'react';

// local modules
import { updateUsersMe } from '../../lib/api';
import { useAuthContext } from '../auth-context';
import {
  getEffects,
  getDefaultUserCollections,
} from './collection-context.utils';
import {
  Effect,
  Collection,
  CollectionItem,
  UserCollections,
} from '../../types';

const CollectionContext = createContext<{
  effects: Effect[];
  activeIds: [number, number] | [];
  collections: Collection[];
  userCollections: UserCollections;
  activeItem: CollectionItem | undefined;
  isActiveItemChecked: boolean;
  handleActiveReset: () => void;
  handleToggleClick: () => void;
  handleItemClick: (collectionId: number, itemId: number) => void;
}>({
  effects: [],
  activeIds: [],
  collections: [],
  userCollections: {},
  activeItem: undefined,
  isActiveItemChecked: false,
  handleActiveReset: () => {},
  handleToggleClick: () => {},
  handleItemClick: (collectionId, itemId) => {},
});

interface CollectionContextProviderProps {
  children: ReactNode;
  collections: Collection[];
}

export const CollectionContextProvider = ({
  children,
  collections,
}: CollectionContextProviderProps) => {
  const auth = useAuthContext();
  const defaultUserCollections = getDefaultUserCollections(collections);
  const [activeIds, setActiveIds] = useState<[number, number] | []>([]);
  const [activeCollectionId, activeItemId] = useMemo(
    () => [activeIds[0], activeIds[1]],
    [activeIds]
  );
  const [userCollections, setUsetCollections] = useState<UserCollections>(
    R.mergeDeepRight(defaultUserCollections, auth.user?.collections || {})
  );

  const isActiveItemChecked = useMemo(
    () =>
      !activeCollectionId || !activeItemId
        ? false
        : userCollections[activeCollectionId][activeItemId],
    [userCollections, activeCollectionId, activeItemId]
  );

  const activeItem = useMemo(() => {
    if (!activeCollectionId || !activeItemId) return undefined;

    return collections
      .find(({ id }) => id === activeCollectionId)
      ?.items.find(({ id }) => id === activeItemId);
  }, [collections, activeCollectionId, activeItemId]);

  const effects = useMemo(() => {
    return getEffects(collections, userCollections);
  }, [collections, userCollections]);

  const handleActiveReset = useCallback(() => {
    setActiveIds([]);
  }, []);

  const handleItemClick = useCallback((collectionId, itemId) => {
    setActiveIds([collectionId, itemId]);
  }, []);

  const handleToggleClick = useCallback(async () => {
    if (!auth.user || !activeCollectionId || !activeItemId) return;

    const currentValue = userCollections[activeCollectionId][activeItemId];
    const activeCollection = {
      [activeCollectionId]: { [activeItemId]: !currentValue },
    };
    const collections = R.mergeDeepRight(userCollections, activeCollection);

    await updateUsersMe({ collections }, auth.accessToken).then((response) => {
      setUsetCollections(response.collections);
      setActiveIds([]);
    });
  }, [
    activeItemId,
    userCollections,
    activeCollectionId,
    auth.user,
    auth.accessToken,
  ]);

  return (
    <CollectionContext.Provider
      value={{
        effects,
        collections,
        activeIds,
        activeItem,
        userCollections,
        isActiveItemChecked,
        handleActiveReset,
        handleToggleClick,
        handleItemClick,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollectionContext = () => useContext(CollectionContext);
