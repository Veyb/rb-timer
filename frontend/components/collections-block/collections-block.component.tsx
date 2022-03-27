// global modules
import { Divider } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';

// local modules
import { User } from '../../types';
import { FilterBlock } from './filter-block';
import { CollectionsModal } from './collections-modal';
import type { Collection } from './collections-block.types';
import { useAuthContext } from '../../contexts/auth-context';
import { getAllCollectionList } from '../../lib/api/collection';
import { CollectionItemComponent } from './collection-item';
import {
  CollectionContextProvider,
  useCollectionContext,
} from '../../contexts/collection-context';

// style modules
import styles from './collections-block.module.css';

const UnsafeCollectionsBlock = () => {
  const { effects, collections } = useCollectionContext();
  const [searchValue, setSearchValue] = useState('');
  const renderedCollections = useMemo(
    () =>
      collections.filter((collection) =>
        collection.items.some(({ item }) =>
          item.name.toLowerCase().includes(searchValue.toLowerCase())
        )
      ),
    [collections, searchValue]
  );

  return (
    <>
      <FilterBlock handleSearch={setSearchValue} />

      <div className={styles.holder}>
        <div className={styles.leftBlock}>
          {renderedCollections.length ? (
            renderedCollections.map((collection) => (
              <CollectionItemComponent
                key={collection.id}
                collection={collection}
              />
            ))
          ) : (
            <p>Нет доступных коллекций</p>
          )}
        </div>
        <div className={styles.rightBlock}>
          <h2 className={styles.title}>Эффект коллекции</h2>
          <Divider className={styles.divider} />
          <div className={styles.effectsHolder}>
            {effects.map((effect) => (
              <p className={styles.effect} key={effect.id}>
                <CheckOutlined />
                {`${effect.name} +${effect.value}${effect.unit || ''}`}
              </p>
            ))}
          </div>
        </div>
      </div>

      <CollectionsModal />
    </>
  );
};

interface CollectionsBlockProps {
  user?: User;
}

export const CollectionsBlock = ({ user }: CollectionsBlockProps) => {
  const auth = useAuthContext();
  const [pending, setPending] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    getAllCollectionList(auth.accessToken).then(({ data, meta }) => {
      setCollections(data);
      setPending(false);
    });
  }, [auth.accessToken]);

  if (pending) {
    return <div>Загрузка...</div>;
  }

  return !collections.length ? (
    <p>Нет доступных коллекций</p>
  ) : (
    <CollectionContextProvider user={user} collections={collections}>
      <UnsafeCollectionsBlock />
    </CollectionContextProvider>
  );
};
