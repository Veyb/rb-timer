'use client';

// global modules
import { Tabs, type TabsProps } from 'antd';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
// local modules
import type { Role } from '../../types';
import { Layout } from '../layout';
import { ManagementBlock } from '../management-block';

const Holder = styled.div`
  padding-bottom: 0;

  h1 {
    margin: 0;
  }

  & .ant-tabs {
    font-size: 1.4rem;
  }

  & .ant-tabs-content {
    height: 100%;
  }

  & .ant-tabs-tab-btn {
    font-size: 1.4rem;
  }
`;

interface ProfileContentProps {
  type: string;
  roles: Role[];
}

export const ProfileContent = ({ type, roles }: ProfileContentProps) => {
  const router = useRouter();
  const { loggedIn, user } = useAuthContext();

  const handleTabClick = (key: string) => {
    router.push(`/profile/${key}`);
  };

  if (!loggedIn || !user) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  // Deliberately not behind the access gate. The gate guards a community's
  // data; this screen is the caller's own account, which they have whether or
  // not they belong to anything. Gating it meant a user with no community
  // clicked "Профиль" in the menu, watched the address change, and got the same
  // placeholder they were already looking at — and, worse, could not reach the
  // control for deleting the account, which `user-account-updates` requires of
  // "any signed-in user, whatever role they hold and whether or not they belong
  // to a community" and which the backend has always granted them.
  //
  // Nothing community-scoped is rendered here: the members screen, the boss
  // list and the invitations section keep their own checks.

  const items: TabsProps['items'] = [
    {
      key: 'management',
      label: 'Управление',
      children: <ManagementBlock user={user} roles={roles} isOwnProfile />,
    },
  ];

  // Management is the only section now. The item collection tab that used to be
  // mounted here when its own URL was asked for went with the Collection and
  // Effect content types; `/profile/collections` no longer resolves at all.
  const activeKey = items.some((item) => item.key === type) ? type : 'management';

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>Профиль</h1>
        <Tabs onChange={handleTabClick} activeKey={activeKey} items={items} />
      </Layout>
    </Holder>
  );
};
