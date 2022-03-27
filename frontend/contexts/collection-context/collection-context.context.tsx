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
  getCheckedCollectionIds,
} from './collection-context.utils';
import {
  Effect,
  Collection,
  CollectionItem,
  UserCollections,
  User,
  FilterType,
} from '../../types';

const CollectionContext = createContext<{
  filter: FilterType;
  effects: Effect[];
  activeIds: [number, number] | [];
  collections: Collection[];
  userCollections: UserCollections;
  activeItem: CollectionItem | undefined;
  nonInteractive: boolean;
  isActiveItemChecked: boolean;
  handleActiveReset: () => void;
  handleToggleClick: () => void;
  handleItemClick: (collectionId: number, itemId: number) => void;
  setFilter: (filter: FilterType) => void;
}>({
  filter: 'all',
  effects: [],
  activeIds: [],
  collections: [],
  userCollections: {},
  activeItem: undefined,
  nonInteractive: false,
  isActiveItemChecked: false,
  handleActiveReset: () => {},
  handleToggleClick: () => {},
  handleItemClick: (collectionId, itemId) => {},
  setFilter: (filter) => {},
});

interface CollectionContextProviderProps {
  children: ReactNode;
  collections: Collection[];
  user?: User;
}

export const CollectionContextProvider = ({
  user,
  children,
  collections,
}: CollectionContextProviderProps) => {
  const auth = useAuthContext();
  const defaultUserCollections = getDefaultUserCollections(collections);
  const [activeIds, setActiveIds] = useState<[number, number] | []>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const nonInteractive = useMemo(() => !!user, [user]);
  const [activeCollectionId, activeItemId] = useMemo(
    () => [activeIds[0], activeIds[1]],
    [activeIds]
  );
  const [userCollections, setUsetCollections] = useState<UserCollections>(
    R.mergeDeepRight(
      defaultUserCollections,
      (user ? user.collections : auth.user?.collections) || {}
    )
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

  const checkedCollectionIds = useMemo(() => {
    return getCheckedCollectionIds(userCollections);
  }, [userCollections]);

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

  const filteredCollections = useMemo(() => {
    switch (filter) {
      case 'all':
        return collections;
      case 'notFinished':
        return collections.filter(
          ({ id }) => !checkedCollectionIds.includes(id)
        );
      case 'finished':
        return collections.filter(({ id }) =>
          checkedCollectionIds.includes(id)
        );
      default:
        return collections;
    }
  }, [collections, filter, checkedCollectionIds]);

  return (
    <CollectionContext.Provider
      value={{
        effects,
        collections: filteredCollections,
        activeIds,
        activeItem,
        nonInteractive,
        userCollections,
        isActiveItemChecked,
        handleActiveReset,
        handleToggleClick,
        handleItemClick,
        filter,
        setFilter,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollectionContext = () => useContext(CollectionContext);
