// global modules
import { HomeContent } from '../components/home-content';
import { getBossList } from '../lib/api';
// local modules
import { getSessionToken } from '../lib/dal';
import type { Boss } from '../types';

export default async function HomePage() {
  const jwt = await getSessionToken();

  let list: Boss[] = [];
  try {
    list = await getBossList(jwt);
  } catch {}

  return <HomeContent list={list} />;
}
