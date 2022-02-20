// global modules
import { Tabs } from 'antd';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import styled from 'styled-components';

// local modules
import { CollectionsBlock } from '../../components/collections-block';
import { Layout } from '../../components/layout';
import { useAuthContext } from '../../contexts/auth-context';

// style modules
import styles from '../../styles/main.module.css';

const { TabPane } = Tabs;

const Holder = styled.div`
  padding-bottom: 0;

  h1 {
    margin: 0;
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
}

const Profile = ({ type }: ProfileProps) => {
  const router = useRouter();
  const { loggedIn, allowed } = useAuthContext();

  const handleTabClick = (key: string) => {
    const route = router.pathname.replace('[type]', key);
    router.push(route);
  };

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowed)
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Доступ ограничен</h2>
        <div>за доступом обратитесь к Тэя</div>
      </div>
    );

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>Профиль</h1>
        <Tabs onChange={handleTabClick} activeKey={type}>
          <TabPane tab="Характиристики" key="stats">
            Раздел в разработке
          </TabPane>
          <TabPane tab="Коллекции" key="collections">
            <CollectionsBlock />
          </TabPane>
        </Tabs>
      </Layout>
    </Holder>
  );
};

export function getServerSideProps(ctx: NextPageContext) {
  const { type } = ctx.query;

  if (type !== 'stats' && type !== 'collections') {
    return { notFound: true };
  }

  return { props: { type } };
}

export default Profile;
