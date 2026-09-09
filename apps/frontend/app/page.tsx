// global modules
import { HomeContent } from '../components/home-content';
import { getBossList, loadOrEmpty } from '../lib/api';
// local modules
import { getSessionToken } from '../lib/dal';
import type { Boss } from '../types';

export default async function HomePage() {
  const jwt = await getSessionToken();

  const list = await loadOrEmpty<Boss[]>(() => getBossList(jwt), []);

  return <HomeContent list={list} />;
}
