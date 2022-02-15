// global modules
import { CheckCircleOutlined } from '@ant-design/icons';

// local modules
import { ItemImage } from '../item-image';
import { getRankColor } from '../collection-block.utils';
import { Collection } from '../collections-block.types';

// style modules
import styles from './collection-item.module.css';

interface CollectionItemComponentProps {
  collection: Collection;
  checkedIds: Record<number, boolean>;
  activeItemIds: [number, number] | [];
  handleItemClick: (collectionId: number, itemId: number) => void;
}

export const CollectionItemComponent = ({
  collection,
  checkedIds,
  activeItemIds,
  handleItemClick,
}: CollectionItemComponentProps) => {
  const checkedArray = Object.values(checkedIds);
  const isCheckedCollection = checkedArray.every(Boolean);
  const [collectionActiveId, itemActiveId] = activeItemIds;

  const effects = collection.effects
    .map(({ name, value, unit }) => `${name} +${value}${unit}`)
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
            checked={checkedIds[collectionItem.id]}
            key={collectionItem.id}
            collectionItem={collectionItem}
            onClick={() => handleItemClick(collection.id, collectionItem.id)}
            active={
              collection.id === collectionActiveId &&
              collectionItem.id === itemActiveId
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
