// style modules
import styles from '../../styles/main.module.css';

export const NotAllowedBlock = () => {
  return (
    <div className={styles.infoHolder}>
      <h2>Доступ ограничен</h2>
      <div>
        за доступом обратитесь в дискорде к кому то из Офицеров, в крайнем
        случае к Тэя
      </div>
    </div>
  );
};
