// global modules
import { Divider } from 'antd';
import { useEffect, useState } from 'react';

// local modules
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

interface UnsafeCollectionsBlockProps {
  collections: Collection[];
}
const UnsafeCollectionsBlock = ({
  collections,
}: UnsafeCollectionsBlockProps) => {
  const { effects } = useCollectionContext();

  return (
    <>
      <div className={styles.holder}>
        <div className={styles.leftBlock}>
          {collections.map((collection) => (
            <CollectionItemComponent
              key={collection.id}
              collection={collection}
            />
          ))}
        </div>
        <div className={styles.rightBlock}>
          <h2 className={styles.title}>Эффект коллекции</h2>
          <Divider className={styles.divider} />
          {effects.map((effect) => (
            <p className={styles.effect} key={effect.id}>
              {`${effect.name} +${effect.value}${effect.unit || ''}`}
            </p>
          ))}
        </div>
      </div>

      <CollectionsModal />
    </>
  );
};

export const CollectionsBlock = () => {
  const auth = useAuthContext();
  const [pending, setPending] = useState(true);
  const [collections, setCollesctions] = useState<Collection[]>([]);

  useEffect(() => {
    getAllCollectionList(auth.accessToken).then(({ data, meta }) => {
      setCollesctions(data);
      setPending(false);
    });
  }, [auth.accessToken]);

  if (pending) {
    return <div>Загрузка...</div>;
  }

  return !collections.length ? (
    <p>Нет доступных коллекций</p>
  ) : (
    <CollectionContextProvider collections={collections}>
      <UnsafeCollectionsBlock collections={collections} />
    </CollectionContextProvider>
  );
};
