'use client';

// global modules
import { type ChangeEvent, type SubmitEvent, useCallback, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { redeemInviteCode } from '../../lib/api';
import { Button } from '../../styled-components';
// style modules
import styles from '../../styles/main.module.css';
import { ErrorDivider } from '../error-divider';
// local modules
import { Input } from '../input';

const FAILED = 'Не удалось применить код. Попробуйте позже.';

/**
 * Keyed on the status, not on the message.
 *
 * The backend answers in English, as it does everywhere in this app, and this
 * is the one screen every invited player meets before anything else. Matching
 * on its prose would break the day someone rewords it; the statuses are part of
 * the contract. 403 covers unknown, revoked, expired and exhausted with one
 * indistinguishable answer on purpose — so one message is the honest rendering
 * of it, not a loss of detail.
 */
const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'Код указан неверно. Проверьте, что он скопирован целиком.',
  403: 'Код не подошёл. Проверьте его или попросите новый.',
  429: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
};

const messageFor = (error: unknown) => {
  const response = (
    error as { response?: { status?: number; data?: { error?: { message?: string } } } }
  )?.response;

  if (response?.status && MESSAGE_BY_STATUS[response.status]) {
    return MESSAGE_BY_STATUS[response.status];
  }

  return response?.data?.error?.message ?? FAILED;
};

interface NoCommunityBlockProps {
  /**
   * Pre-filled from a join link. The reader still has to press the button —
   * a link that joined a community on being opened would be a link anyone
   * could get someone else to follow.
   */
  initialCode?: string;
}

/**
 * Shown to a signed-in user who belongs to no community — the state every new
 * account starts in. Redeeming an invite code is the way out.
 *
 * Every signed-in role may call the redeem endpoint, not only the one
 * registration grants, so this form works for anyone this placeholder is shown
 * to. What it cannot do is move someone between communities: the endpoint
 * refuses a caller who already belongs to one, and this placeholder is not
 * rendered for them anyway.
 */
export const NoCommunityBlock = ({ initialCode = '' }: NoCommunityBlockProps) => {
  const { accessToken } = useAuthContext();
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(undefined);
    setCode(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage(undefined);
      setSubmitting(true);

      try {
        await redeemInviteCode(code, accessToken);
        // The auth context seeds its user from a server component and keeps it
        // in `useState`, so a re-render would still show the placeholder. A
        // real navigation is what re-runs `getCurrentUser()` — the reader does
        // not have to reload anything themselves.
        window.location.assign('/');
      } catch (error) {
        setSubmitting(false);
        setErrorMessage(messageFor(error));
      }
    },
    [accessToken, code],
  );

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
          disabled={submitting || code.trim() === ''}
          data-testid={TEST_IDS.accessPlaceholder.inviteCodeSubmit}
        >
          Присоединиться
        </Button>
      </form>

      <ErrorDivider message={errorMessage} />
    </div>
  );
};
