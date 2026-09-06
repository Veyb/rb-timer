// global modules

import { CheckCircleOutlined } from '@ant-design/icons';
import cn from 'classnames';
import Image from 'next/image';

// local modules
import { IMAGE_URL } from '../../../lib/api';
import type { CollectionItem } from '../collections-block.types';

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
      fill
      sizes="102px"
      alt={item.name}
      className={styles.image}
      src={`${IMAGE_URL}${item.image.url}`}
    />
  ) : (
    <Image
      fill
      sizes="102px"
      alt={item.name}
      className={cn(styles.image, styles.imagePlaceholder)}
      src={'/placeholder.svg'}
    />
  );

  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        key={item.id}
        type="button"
        onClick={onClick}
        className={cn(styles.imageHolder, styles.interactive, { [styles.active]: active })}
      >
        {content}
      </button>
    );
  }

  return (
    <div key={item.id} className={cn(styles.imageHolder, { [styles.active]: active })}>
      {content}
    </div>
  );
};
