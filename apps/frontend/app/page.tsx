// global modules
import { cookies } from 'next/headers';
import { HomeContent } from '../components/home-content';
import { getBossList } from '../lib/api';
// local modules
import type { Boss } from '../types';

export default async function HomePage() {
  const jwt = (await cookies()).get('jwt')?.value;

  let list: Boss[] = [];
  try {
    list = await getBossList(jwt);
  } catch {}

  return <HomeContent list={list} />;
}
