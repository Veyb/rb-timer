'use client';

// global modules
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
import { Button } from '../../styled-components';
// style modules
import styles from '../../styles/main.module.css';
import { ErrorDivider } from '../error-divider';
// local modules
import { Input } from '../input';

const NOT_WIRED_YET =
  'Приём кодов приглашения ещё не подключён. Обратитесь к Администратору, чтобы вас добавили в сообщество.';

/**
 * Shown to a signed-in user who belongs to no community — the state every new
 * account starts in. Redeeming a code is the way out; until that endpoint
 * exists, the form explains that and points at an administrator.
 */
export const NoCommunityBlock = () => {
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(undefined);
    setCode(event.target.value);
  }, []);

  const handleSubmit = useCallback((event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO(community-architecture): call the redeem endpoint once it exists
    // (tasks.md 8.7). Until then the form states plainly that it cannot work
    // rather than failing silently.
    setErrorMessage(NOT_WIRED_YET);
  }, []);

  return (
    <div className={styles.infoHolder} data-testid={TEST_IDS.accessPlaceholder.noCommunity}>
      <h2>Вы не состоите в сообществе</h2>
      <div>Введите код приглашения или обратитесь к Администратору.</div>

      <form onSubmit={handleSubmit} className={styles.inviteForm}>
        <Input
          type="text"
          name="inviteCode"
          value={code}
          onChange={handleChange}
          label="Код приглашения"
          data-testid={TEST_IDS.accessPlaceholder.inviteCodeInput}
        />
        <Button
          size="large"
          htmlType="submit"
          disabled={code.trim() === ''}
          data-testid={TEST_IDS.accessPlaceholder.inviteCodeSubmit}
        >
          Присоединиться
        </Button>
      </form>

      <ErrorDivider message={errorMessage} />
    </div>
  );
};
