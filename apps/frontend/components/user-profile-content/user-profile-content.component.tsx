'use client';

// global modules
import { Tabs, type TabsProps } from 'antd';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useAuthContext } from '../../contexts/auth-context';
// style modules
import styles from '../../styles/main.module.css';
// local modules
import type { CommunityMember, Role } from '../../types';
import { AccessPlaceholder } from '../access-placeholder';
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
  user: CommunityMember;
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
      children: <ManagementBlock user={user} roles={roles} isOwnProfile={false} />,
    },
  ];

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>{`Профиль: ${user.nickname}`}</h1>
        <Tabs onChange={handleTabClick} activeKey={type} items={items} />
      </Layout>
    </Holder>
  );
};
