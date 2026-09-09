'use client';

// global modules
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

// local modules
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { getInviteHistory } from '../../lib/api';
import type { InviteHistoryEntry } from '../../types';
import { ErrorDivider } from '../error-divider';
import { Input } from '../input';

// style modules
import styles from './invite-history-block.module.css';

const formatMoment = (value: string) => dayjs(value).locale('ru').format('DD MMMM YYYY, HH:mm');

/**
 * Everyone the search box should be able to find someone by. The name fields
 * are the snapshot rather than the live account, so a person who has since
 * deleted their account is still findable by the name they used.
 */
const haystack = (entry: InviteHistoryEntry) =>
  [entry.code, entry.issuedByUsername, entry.redeemedByUsername, entry.user?.nickname]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/**
 * Who was admitted into this community, when, and on whose invitation.
 *
 * A separate screen from the code list because it answers a different question
 * and has to keep answering it after the codes are gone. Its rows are built
 * from the snapshot each admission recorded at the time, so nothing anyone
 * deletes afterwards — the code from the admin panel, their own account — takes
 * a name out of it. That is the whole reason officers cannot delete codes.
 *
 * Scoped server-side to the caller's own community, like every other endpoint
 * in this area; there is no community to pass and nothing here re-derives one.
 */
export const InviteHistoryBlock = () => {
  const { accessToken } = useAuthContext();

  const [entries, setEntries] = useState<InviteHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      try {
        setEntries(await getInviteHistory(accessToken));
      } catch (error) {
        setErrorMessage(
          (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
            ?.error?.message ?? 'Не удалось загрузить историю приглашений',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [accessToken]);

  const handleQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter((entry) => haystack(entry).includes(needle));
  }, [entries, query]);

  return (
    <div className={styles.holder}>
      <Input
        type="text"
        name="inviteHistorySearch"
        value={query}
        onChange={handleQuery}
        onClear={() => setQuery('')}
        label="Поиск по никнейму, логину или коду"
        data-testid={TEST_IDS.inviteHistory.search}
      />

      <ErrorDivider message={errorMessage} />

      {!loading && entries.length === 0 && (
        <div className={styles.empty} data-testid={TEST_IDS.inviteHistory.empty}>
          По кодам приглашения в сообщество ещё никто не входил.
        </div>
      )}

      {!loading && entries.length > 0 && shown.length === 0 && (
        <div className={styles.empty} data-testid={TEST_IDS.inviteHistory.noMatches}>
          Ничего не найдено.
        </div>
      )}

      <ul className={styles.list} data-testid={TEST_IDS.inviteHistory.list}>
        {shown.map((entry) => (
          <li
            key={entry.documentId}
            className={styles.row}
            data-testid={TEST_IDS.inviteHistory.row}
          >
            <div className={styles.who}>
              <span data-testid={TEST_IDS.inviteHistory.joiner}>
                {entry.user?.nickname ?? entry.redeemedByUsername}
              </span>
              {/* The account is gone but the record is not — saying so is the
                  point of keeping the name separately from the relation. */}
              {!entry.user && <span className={styles.gone}>аккаунт удалён</span>}
            </div>

            <div className={styles.facts}>
              <span data-testid={TEST_IDS.inviteHistory.moment}>
                {formatMoment(entry.redeemedAt)}
              </span>
              <span data-testid={TEST_IDS.inviteHistory.issuer}>
                {entry.issuedByUsername
                  ? `Пригласил: ${entry.issuedByUsername}`
                  : 'Пригласивший неизвестен'}
              </span>
              <code className={styles.code} data-testid={TEST_IDS.inviteHistory.code}>
                {entry.code}
              </code>
              {!entry.inviteCodeDocumentId && <span className={styles.gone}>код удалён</span>}
              {entry.codeRevokedAt && <span className={styles.gone}>код отозван</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
