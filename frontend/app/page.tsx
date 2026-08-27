// global modules
import { cookies } from 'next/headers';

// local modules
import type { Boss } from '../types';
import { getBossList } from '../lib/api';
import { HomeContent } from '../components/home-content';

export default async function HomePage() {
  const jwt = (await cookies()).get('jwt')?.value;

  let list: Boss[] = [];
  try {
    list = await getBossList(jwt);
  } catch (error: any) {}

  return <HomeContent list={list} />;
}
