'use client';

// global modules
import { Modal } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useCallback, useState } from 'react';
import { TEST_IDS } from '../../constants/test-ids';
// local modules
import { useAuthContext } from '../../contexts/auth-context';
import { deleteOwnAccount, removeCommunityMember, updateCommunityMemberRole } from '../../lib/api';
import { Button, Select } from '../../styled-components';
import type { CommunityMember, Role, RoleType } from '../../types';
import { ErrorDivider } from '../error-divider';
import { LeaveCommunityButton } from '../leave-community-button';

// style modules
import styles from './management-block.module.css';

/**
 * Both the caller's own account and another member of their community land
 * here, and the member endpoint answers with an allowlist — so the prop is the
 * shape they have in common rather than a full `User`.
 */
export type ManagedMember = Pick<
  CommunityMember,
  'documentId' | 'nickname' | 'realname' | 'createdAt' | 'role'
>;

interface ManagementBlockProps {
  user: ManagedMember;
  roles: Role[];
  /**
   * Which controls make sense differs entirely by whose account this is: you
   * cannot change your own role or remove yourself, and nobody else can leave
   * your community or delete your account for you.
   */
  isOwnProfile: boolean;
}

/**
 * The auth context keeps the user in `useState`, seeded once from a server
 * component, so `router.refresh()` re-renders the tree without updating it.
 * These actions change membership or end the session, which the whole shell
 * reads — a real navigation is what re-runs `getCurrentUser()`.
 */
const reload = (path: string) => window.location.assign(path);

export const ManagementBlock = ({
  user: initialUser,
  roles,
  isOwnProfile,
}: ManagementBlockProps) => {
  const { accessToken, allowedManage, logout } = useAuthContext();
  const [user, setUser] = useState(initialUser);
  // The endpoint names a role by its type, so the control offers the same
  // thing it will send rather than an id to be translated on the way out.
  const [roleType, setRoleType] = useState(initialUser.role.type);
  const [confirming, setConfirming] = useState<'remove' | 'delete' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Changing a role is an officer's power over *other* members; the endpoint
  // refuses a self-target, so offering the control here would only mislead.
  const canChangeRole = allowedManage && !isOwnProfile;

  /**
   * The assignable roles, plus the one this member holds if it is not among
   * them — offered but not selectable.
   *
   * A member can hold a role an officer may not assign: the registration
   * default, which is what leaving, being removed, or an operator's hand
   * leaves behind. Without its own entry the control has a value with no
   * option to match, and antd falls back to printing the raw value — an
   * officer reading `authenticated` where every other row says a Russian
   * name. Disabled rather than hidden, because the question the control
   * answers first is "what is this member now".
   */
  const roleOptions = roles.some((role) => role.type === user.role.type)
    ? roles.map((role) => ({ ...role, assignable: true }))
    : [
        { ...user.role, assignable: false },
        ...roles.map((role) => ({ ...role, assignable: true })),
      ];
  const canRemove = allowedManage && !isOwnProfile;

  const run = useCallback(async (action: () => Promise<void>) => {
    setErrorMessage(undefined);
    try {
      await action();
    } catch (error) {
      setConfirming(null);
      setErrorMessage(
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Не удалось выполнить действие',
      );
    }
  }, []);

  const handleSaveRole = useCallback(
    () =>
      run(async () => {
        setUser(await updateCommunityMemberRole(user.documentId, roleType, accessToken));
      }),
    [accessToken, roleType, run, user.documentId],
  );

  const handleRemove = useCallback(
    () =>
      run(async () => {
        await removeCommunityMember(user.documentId, accessToken);
        reload('/users');
      }),
    [accessToken, run, user.documentId],
  );

  const handleDeleteAccount = useCallback(
    () =>
      run(async () => {
        await deleteOwnAccount(accessToken);
        logout();
        reload('/login');
      }),
    [accessToken, logout, run],
  );

  const confirmations = {
    remove: {
      title: 'Исключение из сообщества',
      body: `Исключить ${user.nickname} из сообщества? Аккаунт останется, но роль будет сброшена.`,
      action: 'Да, исключить',
      onConfirm: handleRemove,
    },
    delete: {
      title: 'Удаление аккаунта',
      body: 'Аккаунт будет удалён безвозвратно вместе с членством в сообществе.',
      action: 'Да, удалить',
      onConfirm: handleDeleteAccount,
    },
  } as const;

  const confirmation = confirming ? confirmations[confirming] : null;

  return (
    <>
      <div className={styles.holder}>
        <div className={styles.wrapper}>
          <div>{`Имя: ${user.realname}`}</div>
          <div>{`Никнейм: ${user.nickname}`}</div>
          <div className={styles.role}>
            <span>Роль:</span>
            {canChangeRole ? (
              <Select
                size="small"
                variant="borderless"
                onChange={(value) => setRoleType(value as RoleType)}
                defaultValue={user.role.type}
                popupMatchSelectWidth={false}
                data-testid={TEST_IDS.profileManagement.roleSelect}
              >
                {roleOptions.map((role) => (
                  <Select.Option key={role.type} value={role.type} disabled={!role.assignable}>
                    {role.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <span data-testid={TEST_IDS.profileManagement.roleValue}>{user.role.name}</span>
            )}
          </div>
          <div>
            {`Дата регистрации: ${dayjs(user.createdAt).locale('ru').format('DD MMMM YYYY в HH:mm')}`}
          </div>

          {isOwnProfile && <LeaveCommunityButton />}

          {canRemove && (
            <Button
              onClick={() => setConfirming('remove')}
              data-testid={TEST_IDS.profileManagement.removeMember}
            >
              Исключить из сообщества
            </Button>
          )}

          {isOwnProfile && (
            <Button
              className={styles.deleteBtn}
              onClick={() => setConfirming('delete')}
              data-testid={TEST_IDS.profileManagement.deleteAccount}
            >
              Удалить аккаунт
            </Button>
          )}
        </div>

        {canChangeRole && (
          <Button type="primary" onClick={handleSaveRole} disabled={roleType === user.role.type}>
            Сохранить
          </Button>
        )}
      </div>

      <ErrorDivider message={errorMessage} />

      <Modal
        centered
        open={confirmation !== null}
        title={confirmation?.title}
        onCancel={() => setConfirming(null)}
        footer={
          <Button
            onClick={confirmation?.onConfirm}
            data-testid={TEST_IDS.profileManagement.confirm}
          >
            {confirmation?.action}
          </Button>
        }
      >
        <p>{confirmation?.body}</p>
      </Modal>
    </>
  );
};
