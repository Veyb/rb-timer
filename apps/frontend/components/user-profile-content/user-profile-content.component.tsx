'use client';

// global modules
import { Tabs, type TabsProps } from 'antd';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
// local modules
import type { Role, User } from '../../types';
import { AccessPlaceholder } from '../access-placeholder';
import { CollectionsBlock } from '../collections-block';
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

interface UserProfileContentProps {
  type: string;
  user: User;
  roles: Role[];
}

export const UserProfileContent = ({ type, user, roles }: UserProfileContentProps) => {
  const router = useRouter();
  const { loggedIn, allowedUpdate } = useAuthContext();

  const handleTabClick = (key: string) => {
    router.push(`/users/${user.id}/${key}`);
  };

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowedUpdate) return <AccessPlaceholder />;

  const items: TabsProps['items'] = [
    {
      key: 'management',
      label: 'Управление',
      children: <ManagementBlock user={user} roles={roles} />,
    },
  ];

  // TODO(community-architecture): delete along with the Collection and Effect
  // content types and the /users/:id/collections route. See the same note in
  // profile-content — withdrawn from the tab bar, still mounted for a direct
  // URL so existing links keep working.
  if (type === 'collections') {
    items.push({
      key: 'collections',
      label: 'Коллекции',
      children: <CollectionsBlock user={user} />,
    });
  }

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>{`Профиль: ${user.nickname}`}</h1>
        <Tabs onChange={handleTabClick} activeKey={type} items={items} />
      </Layout>
    </Holder>
  );
};
