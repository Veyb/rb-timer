'use client';

// global modules
import { Modal } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useCallback, useEffect, useState } from 'react';

// local modules
import { TEST_IDS } from '../../constants/test-ids';
import { useAuthContext } from '../../contexts/auth-context';
import { createInviteCode, getInviteCodes, revokeInviteCode } from '../../lib/api';
import { useIsClient } from '../../lib/hooks/use-is-client';
import { Button, Select } from '../../styled-components';
import type { InviteCode } from '../../types';
import { ErrorDivider } from '../error-divider';
// style modules
import styles from './invites-block.module.css';
import {
  EXPIRY_OPTIONS,
  joinLinkFor,
  MAX_USES_OPTIONS,
  remainingLabel,
  STATUS_LABELS,
  statusOf,
  toNewInviteCode,
} from './invites-block.utils';

const formatMoment = (value: string) => dayjs(value).locale('ru').format('DD MMMM YYYY, HH:mm');

const errorFrom = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message ?? fallback;

/**
 * An officer's invite codes: issue one, see how much life is left in each,
 * see who it let in, revoke it.
 *
 * Only ever mounted for an officer who belongs to a community — the tab that
 * holds it is added on `allowedManage`, and the three endpoints behind it
 * are granted to `officer` alone and scoped server-side to the caller's own
 * community. Nothing here re-derives that scope; there is no community to pass.
 */
export const InvitesBlock = () => {
  const { accessToken } = useAuthContext();
  const mounted = useIsClient();

  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState<number>(MAX_USES_OPTIONS[0].value);
  const [expiryHours, setExpiryHours] = useState<number>(EXPIRY_OPTIONS[0].value);
  const [revoking, setRevoking] = useState<InviteCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setCodes(await getInviteCodes(accessToken));
    } catch (error) {
      setErrorMessage(errorFrom(error, 'Не удалось загрузить коды приглашения'));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    setErrorMessage(undefined);
    setCreating(true);

    try {
      const created = await createInviteCode(toNewInviteCode(maxUses, expiryHours), accessToken);
      // Prepended rather than refetched: the list is ordered newest first, and
      // the response is the same shape the list is built from.
      setCodes((current) => [created, ...current]);
    } catch (error) {
      setErrorMessage(errorFrom(error, 'Не удалось создать код'));
    } finally {
      setCreating(false);
    }
  }, [accessToken, expiryHours, maxUses]);

  const handleRevoke = useCallback(async () => {
    if (!revoking) return;

    setErrorMessage(undefined);

    try {
      const revoked = await revokeInviteCode(revoking.documentId, accessToken);
      setCodes((current) =>
        current.map((entry) => (entry.documentId === revoked.documentId ? revoked : entry)),
      );
    } catch (error) {
      setErrorMessage(errorFrom(error, 'Не удалось отозвать код'));
    } finally {
      setRevoking(null);
    }
  }, [accessToken, revoking]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be refused outright — an insecure origin, a
      // permission the browser never granted. The link is in a field the reader
      // can select by hand, so there is nothing to recover from here.
    }
  }, []);

  return (
    <div className={styles.holder}>
      <div className={styles.createRow} data-testid={TEST_IDS.profileInvites.create}>
        {/* A div, not a label: antd's Select renders no form control to
            associate one with, so the caption is a caption and the control
            names itself. */}
        <div className={styles.field}>
          <span>Использований</span>
          <Select
            size="small"
            value={maxUses}
            aria-label="Число использований кода"
            onChange={(value) => setMaxUses(value as number)}
            popupMatchSelectWidth={false}
            data-testid={TEST_IDS.profileInvites.maxUses}
          >
            {MAX_USES_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* A div, not a label: antd's Select renders no form control to
            associate one with, so the caption is a caption and the control
            names itself. */}
        <div className={styles.field}>
          <span>Действует</span>
          <Select
            size="small"
            value={expiryHours}
            aria-label="Срок действия кода"
            onChange={(value) => setExpiryHours(value as number)}
            popupMatchSelectWidth={false}
            data-testid={TEST_IDS.profileInvites.expiry}
          >
            {EXPIRY_OPTIONS.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Button type="primary" onClick={handleCreate} disabled={creating}>
          Создать код
        </Button>
      </div>

      <ErrorDivider message={errorMessage} />

      {!loading && codes.length === 0 && (
        <div className={styles.empty} data-testid={TEST_IDS.profileInvites.empty}>
          Кодов пока нет. Создайте первый, чтобы пригласить игрока в сообщество.
        </div>
      )}

      <ul className={styles.list} data-testid={TEST_IDS.profileInvites.list}>
        {codes.map((code) => {
          const status = statusOf(code);

          return (
            <li
              key={code.documentId}
              className={styles.row}
              data-testid={TEST_IDS.profileInvites.row}
            >
              <div className={styles.head}>
                <code className={styles.code} data-testid={TEST_IDS.profileInvites.code}>
                  {code.code}
                </code>
                <span
                  className={styles[status]}
                  data-testid={TEST_IDS.profileInvites.status}
                  data-status={status}
                >
                  {STATUS_LABELS[status]}
                </span>
                {status !== 'revoked' && (
                  <Button
                    onClick={() => setRevoking(code)}
                    data-testid={TEST_IDS.profileInvites.revoke}
                  >
                    Отозвать
                  </Button>
                )}
              </div>

              <div className={styles.facts}>
                <span data-testid={TEST_IDS.profileInvites.remaining}>{remainingLabel(code)}</span>
                <span data-testid={TEST_IDS.profileInvites.expires}>
                  {code.expiresAt ? `Истекает ${formatMoment(code.expiresAt)}` : 'Бессрочный'}
                </span>
              </div>

              {/* Readable and selectable rather than only copyable: the
                  clipboard API needs a secure origin and a permission, and a
                  link nobody can read is worse than one nobody can copy. */}
              <div className={styles.share}>
                <input
                  readOnly
                  className={styles.link}
                  value={mounted ? joinLinkFor(code.code, window.location.origin) : ''}
                  onFocus={(event) => event.currentTarget.select()}
                  data-testid={TEST_IDS.profileInvites.joinLink}
                />
                <Button
                  onClick={() => copy(joinLinkFor(code.code, window.location.origin))}
                  data-testid={TEST_IDS.profileInvites.copyLink}
                >
                  Скопировать
                </Button>
              </div>

              {code.redemptions.length > 0 && (
                <ul className={styles.redemptions}>
                  {code.redemptions.map((redemption) => (
                    <li
                      key={redemption.documentId}
                      data-testid={TEST_IDS.profileInvites.redemption}
                    >
                      {`${redemption.user?.nickname ?? 'Удалённый аккаунт'} — ${formatMoment(redemption.redeemedAt)}`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <Modal
        centered
        open={revoking !== null}
        title="Отзыв кода приглашения"
        onCancel={() => setRevoking(null)}
        footer={
          <Button onClick={handleRevoke} data-testid={TEST_IDS.profileManagement.confirm}>
            Да, отозвать
          </Button>
        }
      >
        <p>
          {`Код ${revoking?.code} перестанет работать. Он останется в списке вместе с записью о том, кто и когда по нему вошёл — удалить её нельзя, и это намеренно. Уже присоединившиеся игроки останутся в сообществе.`}
        </p>
      </Modal>
    </div>
  );
};
