// global modules
import { Button, Modal } from 'antd';

// local modules
import { ItemImage } from '../item-image';
import { getRankColor } from '../collection-block.utils';
import { useCollectionContext } from '../../../contexts/collection-context';

// styles modules
import styles from '../collections-block.module.css';

export const CollectionsModal = () => {
  const {
    activeItem,
    nonInteractive,
    isActiveItemChecked,
    handleActiveReset,
    handleToggleClick,
  } = useCollectionContext();

  return (
    <Modal
      centered
      visible={!!activeItem}
      onCancel={handleActiveReset}
      footer={
        nonInteractive ? null : (
          <Button type="primary" onClick={handleToggleClick}>
            {isActiveItemChecked ? 'Удалить' : 'Добавить'}
          </Button>
        )
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
  );
};
