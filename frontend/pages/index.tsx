// global modules
import { parseCookies } from 'nookies';
import type { NextPage, NextPageContext } from 'next';

// local modules
import type { Boss } from '../types';
import { getBossList } from '../lib/api';
import { useAuthContext } from '../contexts/auth-context';
import { BossListTable } from '../components/boss-list-table';
import { BossContextProvider } from '../contexts/boss-context';

// style modules
import styles from '../styles/main.module.css';

interface MainProps {
  list: Boss[];
}

const Main: NextPage<MainProps> = ({ list }) => {
  const { loggedIn, allowed } = useAuthContext();

  if (!loggedIn) {
    return (
      <div className={styles.infoHolder}>
        <h2 className={styles.infoMessage}>Требуется авторизация</h2>
      </div>
    );
  }

  if (!allowed) {
    <div className={styles.infoHolder}>
      <h2 className={styles.infoMessage}>Доступ ограничен</h2>
      <div>за доступом обратитесь к Тэя</div>
    </div>;
  }

  return (
    <BossContextProvider bossList={list}>
      <div className={styles.container}>
        <BossListTable />
      </div>
    </BossContextProvider>
  );
};

export default Main;

export async function getServerSideProps(ctx: NextPageContext) {
  let list: Boss[] = [];
  const jwt = parseCookies(ctx).jwt;

  try {
    const bossList = await getBossList(jwt);

    list = bossList;
  } catch (error: any) {}

  return { props: { list } };
}
