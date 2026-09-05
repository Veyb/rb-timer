'use client';

// global modules
import { Tabs, type TabsProps } from 'antd';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

// local modules
import type { Role } from '../../types';
import { Layout } from '../layout';
import { useAuthContext } from '../../contexts/auth-context';
import { ManagementBlock } from '../management-block';
import { CollectionsBlock } from '../collections-block';
import { NotAllowedBlock } from '../not-allowed-block';

// style modules
import styles from '../../styles/main.module.css';

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
  const { loggedIn, allowed, user } = useAuthContext();

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

  if (!allowed) return <NotAllowedBlock />;

  const items: TabsProps['items'] = [
    {
      key: 'management',
      label: 'Управление',
      children: <ManagementBlock user={user} roles={roles} />,
    },
    {
      key: 'collections',
      label: 'Коллекции',
      children: <CollectionsBlock />,
    },
  ];

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>Профиль</h1>
        <Tabs onChange={handleTabClick} activeKey={type} items={items} />
      </Layout>
    </Holder>
  );
};
