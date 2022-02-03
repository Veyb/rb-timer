// global modules
import Head from 'next/head';
import { parseCookies } from 'nookies';
import type { NextPage, NextPageContext } from 'next';
// import Image from 'next/image';

// local modules
import type { Boss } from '../types';
import { getBossList } from '../lib/api';
import { BossContextProvider } from '../contexts/boss-context';
import { BossListTable } from '../components/boss-list-table';

// style modules
import styles from '../styles/main.module.css';

interface MainProps {
  list: Boss[];
}

const Main: NextPage<MainProps> = ({ list }) => {
  return (
    <BossContextProvider bossList={list}>
      <Head>
        <title>L2m db</title>
        <meta
          name="description"
          content="Timer for tracking the respawn of raid bosses"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
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
