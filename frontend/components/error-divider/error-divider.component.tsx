// global modules
import * as R from 'ramda';
import { ExclamationCircleOutlined } from '@ant-design/icons';

// style modules
import styles from './error-divider.module.css';

interface ErrorDividerProps {
  message: string | undefined;
  minLines?: number;
}

export const ErrorDivider = ({ minLines = 2, message }: ErrorDividerProps) => {
  const errorPlaceholder = R.repeat('\u00A0', minLines + 1).join('\n');

  return (
    <div className={styles.errorDivider}>
      <div className={styles.errorPlaceholder}>{errorPlaceholder}</div>
      <div className={styles.errorMessage}>
        {message && (
          <div className={styles.errorHolder}>
            <ExclamationCircleOutlined className={styles.errorIcon} />
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
