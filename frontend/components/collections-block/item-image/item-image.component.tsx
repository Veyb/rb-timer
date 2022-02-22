// global modules
import cn from 'classnames';
import Image from 'next/image';
import { CheckCircleOutlined } from '@ant-design/icons';

// local modules
import { IMAGE_URL } from '../../../lib/api';
import { CollectionItem } from '../collections-block.types';

// style modules
import styles from './item-image.module.css';

interface ItemImageProps {
  active?: boolean;
  checked?: boolean;
  onClick?: () => void;
  collectionItem: CollectionItem;
}

export const ItemImage = ({
  active = false,
  checked = false,
  onClick,
  collectionItem,
}: ItemImageProps) => {
  const { item } = collectionItem;

  const image = item.image ? (
    <Image
      layout="fill"
      alt={item.name}
      className={styles.image}
      src={`${IMAGE_URL}${item.image.url}`}
    />
  ) : (
    <Image
      layout="fill"
      alt={item.name}
      className={cn(styles.image, styles.imagePlaceholder)}
      src={'/placeholder.svg'}
    />
  );

  return (
    <div
      key={item.id}
      onClick={onClick}
      className={cn(styles.imageHolder, {
        [styles.active]: active,
        [styles.interactive]: !!onClick,
      })}
    >
      {image}
      {!!collectionItem.enhancement && (
        <i className={styles.enhancement}>{`+${collectionItem.enhancement}`}</i>
      )}
      {checked && (
        <>
          <div className={styles.imageOverlay}></div>
          <CheckCircleOutlined color="#d46f1b" className={styles.icon} />
        </>
      )}
    </div>
  );
};
