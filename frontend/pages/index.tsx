import { useCallback, useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
// import Image from 'next/image';

import { BossListTable } from '../components/boss-list-table';
import { Boss, BossApiResponse } from '../types';
import { expandBossList } from '../lib/utils';
import { get } from '../lib/api';

import styles from '../styles/main.module.css';

interface MainProps {
  data: BossApiResponse[];
}

const Main: NextPage<MainProps> = ({ data }) => {
  const [bossList, setBossList] = useState<Boss[]>(expandBossList(data));

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
      get('bosses').then((data) => setBossList(expandBossList(data)));
    }, 10000);
    return () => clearInterval(refetchTimer);
  }, []);

  // console.log(bossList.map(({ time }) => time));

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

      <main>
        <BossListTable bossList={bossList} updateBossList={updateBossList} />
      </main>

      <footer className={styles.footer}></footer>
    </div>
  );
};

export default Main;

export async function getStaticProps() {
  const data = await get('bosses');

  return { props: { data } };
}
