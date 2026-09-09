'use client';

// global modules
import Link from 'next/link';

// local modules
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
import { NoCommunityBlock } from '../access-placeholder';

interface JoinContentProps {
  /** Straight from `?code=`; the backend is what decides whether it is real. */
  code: string;
}

/**
 * What a join link opens.
 *
 * The link only carries a code — it grants nothing by being followed. Whoever
 * opens it still has to be signed in, still has to press the button, and the
 * endpoint still checks the code. So the three states this page can be in are
 * about the reader, not about the link.
 */
export const JoinContent = ({ code }: JoinContentProps) => {
  const { loggedIn, hasCommunity, user } = useAuthContext();

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder} data-testid={TEST_IDS.join.signInRequired}>
        <h2>Требуется авторизация</h2>
        <div>
          Войдите или зарегистрируйтесь, чтобы применить код приглашения
          {code && <> — вернитесь по этой же ссылке после входа.</>}
        </div>
        <div className={styles.inviteForm}>
          <Link href="/login">Вход</Link>
          <Link href="/register">Регистрация</Link>
        </div>
      </div>
    );
  }

  if (hasCommunity) {
    return (
      <div className={styles.infoHolder} data-testid={TEST_IDS.join.alreadyMember}>
        <h2>Вы уже состоите в сообществе</h2>
        <div>
          {`Код приглашения можно применить, только не состоя ни в одном сообществе. Покиньте «${user?.community?.name ?? ''}» в профиле, если действительно хотите перейти.`}
        </div>
      </div>
    );
  }

  return <NoCommunityBlock initialCode={code} />;
};
