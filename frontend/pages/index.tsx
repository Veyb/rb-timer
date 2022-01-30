import { useCallback, useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
// import Image from 'next/image';

import { BossListTable } from '../components/boss-list-table';
import { Header } from '../components/header';
import { Boss } from '../types';
import { getBossList } from '../lib/api';

import styles from '../styles/main.module.css';

interface MainProps {
  data: Boss[];
}

const Main: NextPage<MainProps> = ({ data }) => {
  const [bossList, setBossList] = useState<Boss[]>(data);

  const updateBossList = useCallback(
    (boss: Boss) => {
      const index = bossList.findIndex(({ id }) => id === boss.id);
      const newBossList = bossList.slice();
      newBossList[index] = boss;
      setBossList(newBossList);
    },
    [bossList, setBossList]
  );

  useEffect(() => {
    const refetchTimer = setInterval(() => {
      getBossList().then((data) => setBossList(data));
    }, 10000);
    return () => clearInterval(refetchTimer);
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>L2m db</title>
        <meta
          name="description"
          content="Timer for tracking the respawn of raid bosses"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main>
        <BossListTable bossList={bossList} updateBossList={updateBossList} />
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
};

export default Main;

export async function getServerSideProps() {
  const data = await getBossList();

  return { props: { data } };
}
