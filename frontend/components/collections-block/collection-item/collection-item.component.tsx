// global modules
import { CheckCircleOutlined } from '@ant-design/icons';

// local modules
import { ItemImage } from '../item-image';
import { getRankColor } from '../collection-block.utils';
import { Collection } from '../collections-block.types';
import { useCollectionContext } from '../../../contexts/collection-context';

// style modules
import styles from './collection-item.module.css';

interface CollectionItemComponentProps {
  collection: Collection;
}

export const CollectionItemComponent = ({
  collection,
}: CollectionItemComponentProps) => {
  const { activeIds, userCollections, handleItemClick } =
    useCollectionContext();
  const checkedArray = Object.values(userCollections[collection.id]);
  const isCheckedCollection = checkedArray.every(Boolean);
  const [activeCollectionId, activeItemId] = activeIds;

  const effects = collection.effects
    .map(({ name, value, unit }) => `${name} +${value}${unit || ''}`)
    .join(', ');

  return (
    <div className={styles.holder}>
      <div className={styles.textHolder}>
        <h3
          className={styles.text}
          style={{ color: getRankColor(collection.rank) }}
        >
          {collection.name}
        </h3>
        <p className={styles.text}>{effects}</p>
      </div>
      <div className={styles.imagesHolder}>
        {collection.items.map((collectionItem) => (
          <ItemImage
            key={collectionItem.id}
            checked={userCollections[collection.id][collectionItem.id]}
            collectionItem={collectionItem}
            onClick={() => handleItemClick(collection.id, collectionItem.id)}
            active={
              collection.id === activeCollectionId &&
              collectionItem.id === activeItemId
            }
          />
        ))}
      </div>
      <div className={styles.checkedCounter}>
        {isCheckedCollection ? (
          <CheckCircleOutlined color="#d46f1b" className={styles.icon} />
        ) : (
          `${checkedArray.filter(Boolean).length}/${checkedArray.length}`
        )}
      </div>
    </div>
  );
};
