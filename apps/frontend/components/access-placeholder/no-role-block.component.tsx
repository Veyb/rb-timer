// global modules
import { TEST_IDS } from '../../constants/test-ids';
// style modules
import styles from '../../styles/main.module.css';

/**
 * Shown to a member of a community whose role does not reach the screen they
 * asked for — either still on the role registration grants, or a viewer on a
 * screen that needs more. Either way an officer of their own community is the
 * one who can change it.
 */
export const NoRoleBlock = () => {
  return (
    <div className={styles.infoHolder} data-testid={TEST_IDS.accessPlaceholder.noRole}>
      <h2>Доступ ограничен</h2>
      <div>За доступом обратитесь к кому-нибудь из Офицеров вашего сообщества.</div>
    </div>
  );
};
