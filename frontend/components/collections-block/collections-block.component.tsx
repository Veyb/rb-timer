// global modules
import * as R from 'ramda';
import { Button, Divider, Modal } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

// local modules
import { ItemImage } from './item-image';
import type { Collection, Effect } from './collections-block.types';
import { useAuthContext } from '../../contexts/auth-context';
import { getRankColor } from './collection-block.utils';
import { CollectionItemComponent } from './collection-item';
import { getCollectionList, updateUser } from '../../lib/api';

// style modules
import styles from './collections-block.module.css';

interface UnsafeCollectionsBlockProps {
  collections: Collection[];
}
const UnsafeCollectionsBlock = ({
  collections,
}: UnsafeCollectionsBlockProps) => {
  const auth = useAuthContext();
  const defaultUserCollections = collections.reduce((acc, collection) => {
    return {
      ...acc,
      [collection.id]: collection.items.reduce((acc, item) => {
        return { ...acc, [item.id]: false };
      }, {}),
    };
  }, {});

  const [activeItemIds, setActiveItemIds] = useState<[number, number] | []>([]);
  const { collectionActiveId, itemActiveId } = useMemo(
    () => ({
      collectionActiveId: activeItemIds[0],
      itemActiveId: activeItemIds[1],
    }),
    [activeItemIds]
  );
  const [userCollections, setUsetCollections] = useState(
    R.mergeDeepRight(defaultUserCollections, auth.user?.collections || {})
  );

  const activeItem = useMemo(() => {
    if (!collectionActiveId || !itemActiveId) return undefined;

    return collections
      .find(({ id }) => id === collectionActiveId)
      ?.items.find(({ id }) => id === itemActiveId);
  }, [collections, collectionActiveId, itemActiveId]);

  const handleItemClick = useCallback((collectionId, itemId) => {
    setActiveItemIds([collectionId, itemId]);
  }, []);

  const handleAddClick = useCallback(async () => {
    if (!auth.user || !collectionActiveId || !itemActiveId) return;

    const currentValue = userCollections[collectionActiveId][itemActiveId];
    const activeCollection = {
      [collectionActiveId]: { [itemActiveId]: !currentValue },
    };
    const collections = R.mergeDeepRight(userCollections, activeCollection);

    await updateUser(auth.user.id, { collections }, auth.accessToken).then(
      (response) => {
        setUsetCollections(response.collections);
        setActiveItemIds([]);
      }
    );
  }, [
    collectionActiveId,
    itemActiveId,
    userCollections,
    auth.user,
    auth.accessToken,
  ]);

  const effects = useMemo(() => {
    const checkedCollectionIds = Object.entries(userCollections).reduce(
      (acc: number[], [collectionId, checkedIds]) => {
        const checkedArray = Object.values(checkedIds);
        const isCheckedCollection = checkedArray.every(Boolean);

        return isCheckedCollection ? [...acc, +collectionId] : acc;
      },
      []
    );

    const onlyCheckedCollections = collections.filter(({ id }) =>
      checkedCollectionIds.includes(id)
    );

    return onlyCheckedCollections.reduce(
      (acc: Record<string, Effect>, collection) => {
        collection.effects.forEach((effect) => {
          acc[effect.id]
            ? (acc[effect.id] = {
                ...acc[effect.id],
                value: acc[effect.id].value + effect.value,
              })
            : (acc[effect.id] = effect);
        });

        return acc;
      },
      {}
    );
  }, [collections, userCollections]);

  return (
    <>
      <div className={styles.holder}>
        <div className={styles.leftBlock}>
          {collections.map((collection) => (
            <CollectionItemComponent
              key={collection.id}
              collection={collection}
              activeItemIds={activeItemIds}
              handleItemClick={handleItemClick}
              checkedIds={userCollections[collection.id] || {}}
            />
          ))}
        </div>
        <div className={styles.rightBlock}>
          <h2 className={styles.title}>Эффект коллекции</h2>
          <Divider className={styles.divider} />
          {Object.values(effects).map((effect) => (
            <p
              key={effect.id}
            >{`${effect.name} +${effect.value}${effect.unit}`}</p>
          ))}
        </div>
      </div>

      {collectionActiveId && itemActiveId && activeItem && (
        <Modal
          centered
          visible={!!activeItem}
          onCancel={() => setActiveItemIds([])}
          footer={
            <Button type="primary" onClick={handleAddClick}>
              {userCollections[collectionActiveId][itemActiveId]
                ? 'Удалить'
                : 'Добавить'}
            </Button>
          }
        >
          {activeItem && (
            <>
              <ItemImage collectionItem={activeItem} />
              <p
                className={styles.itemName}
                style={{ color: getRankColor(activeItem.item.rank) }}
              >
                {activeItem.item.name}
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
};

export const CollectionsBlock = () => {
  const auth = useAuthContext();
  const [collections, setCollesctions] = useState<Collection[]>([]);

  useEffect(() => {
    getCollectionList(auth.accessToken).then((respose) =>
      setCollesctions(respose)
    );
  }, [auth.accessToken]);

  return !collections.length ? null : (
    <UnsafeCollectionsBlock collections={collections} />
  );
};
