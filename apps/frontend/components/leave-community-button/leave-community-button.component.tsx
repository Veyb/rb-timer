'use client';

// global modules
import { Modal } from 'antd';
import { useCallback, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
// local modules
import { useAuthContext } from '../../contexts/auth-context';
import { leaveCommunity } from '../../lib/api';
import { Button } from '../../styled-components';
import { ErrorDivider } from '../error-divider';

/**
 * Leaving is available to every member, whatever their role — which is why
 * this is a component rather than part of the management screen. A member
 * still on the role registration grants never reaches that screen: the access
 * gate shows them a placeholder instead, and they are the ones most likely to
 * want out. The placeholder carries this button too.
 */
export const LeaveCommunityButton = () => {
  const { accessToken, hasCommunity } = useAuthContext();
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleConfirm = useCallback(async () => {
    setErrorMessage(undefined);

    try {
      await leaveCommunity(accessToken);
      // The auth context seeds its user from a server component and keeps it in
      // `useState`, so only a real navigation re-reads the membership.
      window.location.assign('/');
    } catch (error) {
      setConfirming(false);
      setErrorMessage(
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Не удалось покинуть сообщество',
      );
    }
  }, [accessToken]);

  if (!hasCommunity) return null;

  return (
    <>
      <Button
        onClick={() => setConfirming(true)}
        data-testid={TEST_IDS.profileManagement.leaveCommunity}
      >
        Покинуть сообщество
      </Button>

      <ErrorDivider message={errorMessage} />

      <Modal
        centered
        open={confirming}
        title="Выход из сообщества"
        onCancel={() => setConfirming(false)}
        footer={
          <Button onClick={handleConfirm} data-testid={TEST_IDS.profileManagement.confirm}>
            Да, выйти
          </Button>
        }
      >
        <p>
          Вы потеряете доступ к таймерам и роль в сообществе. Вернуться можно только по новому коду
          приглашения.
        </p>
      </Modal>
    </>
  );
};
