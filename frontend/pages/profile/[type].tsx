// global modules
import { Tabs } from 'antd';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import { parseCookies } from 'nookies';
import styled from 'styled-components';

// local modules
import { Role } from '../../types';
import { getRoles } from '../../lib/api';
import { Layout } from '../../components/layout';
import { useAuthContext } from '../../contexts/auth-context';
import { ManagementBlock } from '../../components/management-block';
import { CollectionsBlock } from '../../components/collections-block';
import { NotAllowedBlock } from '../../components/not-allowed-block';

// style modules
import styles from '../../styles/main.module.css';

const { TabPane } = Tabs;

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

interface ProfileProps {
  type: string;
  roles: Role[];
}

const Profile = ({ type, roles }: ProfileProps) => {
  const router = useRouter();
  const { loggedIn, allowed, user } = useAuthContext();

  const handleTabClick = (key: string) => {
    const route = router.pathname.replace('[type]', key);
    router.push(route);
  };

  if (!loggedIn || !user) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowed) return <NotAllowedBlock />;

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>Профиль</h1>
        <Tabs onChange={handleTabClick} activeKey={type}>
          <TabPane tab="Управление" key="management">
            <ManagementBlock user={user} roles={roles} />
          </TabPane>
          <TabPane tab="Коллекции" key="collections">
            <CollectionsBlock />
          </TabPane>
        </Tabs>
      </Layout>
    </Holder>
  );
};

export async function getServerSideProps(ctx: NextPageContext) {
  let roles: Role[] = [];
  const { type } = ctx.query;

  if (type !== 'management' && type !== 'collections') {
    return { notFound: true };
  }

  const jwt = parseCookies(ctx).jwt;

  if (jwt) {
    try {
      const rolesData = await getRoles(jwt);
      roles = rolesData;
    } catch (err: any) {}
  }

  return { props: { type, roles } };
}

export default Profile;
