// global modules
import { Tabs } from 'antd';
import { parseCookies } from 'nookies';
import { NextPageContext } from 'next';
import { useRouter } from 'next/router';
import styled from 'styled-components';

// local modules
import { User } from '../../../types';
import { getUser } from '../../../lib/api';
import { Layout } from '../../../components/layout';
import { useAuthContext } from '../../../contexts/auth-context';
import { CollectionsBlock } from '../../../components/collections-block';

// style modules
import styles from '../../../styles/main.module.css';

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

interface UserProfileByIdProps {
  type: string;
  user: User;
}

const UserProfileById = ({ type, user }: UserProfileByIdProps) => {
  const router = useRouter();
  const { loggedIn, allowedUpdate } = useAuthContext();

  const handleTabClick = (key: string) => {
    const route = router.pathname
      .replace('[userId]', `${user.id}`)
      .replace('[type]', key);
    router.push(route);
  };

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowedUpdate)
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Доступ ограничен</h2>
        <div>за доступом обратитесь к Тэя</div>
      </div>
    );

  return (
    <Holder className={styles.container}>
      <Layout className={styles.profileLayout}>
        <h1>{`Профиль: ${user.nickname}`}</h1>
        <Tabs onChange={handleTabClick} activeKey={type}>
          <TabPane tab="Характеристики" key="stats">
            Раздел в разработке
          </TabPane>
          <TabPane tab="Коллекции" key="collections">
            <CollectionsBlock user={user} />
          </TabPane>
        </Tabs>
      </Layout>
    </Holder>
  );
};

export async function getServerSideProps(ctx: NextPageContext) {
  let user = null;
  const { type, userId } = ctx.query;

  if (
    typeof userId !== 'string' ||
    (type !== 'stats' && type !== 'collections')
  ) {
    return { notFound: true };
  }

  const jwt = parseCookies(ctx).jwt;

  if (jwt) {
    try {
      const data = await getUser(jwt, userId);
      user = data;
    } catch (err: any) {}
  }

  return { props: { type, user } };
}

export default UserProfileById;
