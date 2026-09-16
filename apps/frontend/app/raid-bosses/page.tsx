// global modules
import { RaidBossList } from '../../components/raid-boss-list';
import { getRaidBossList, loadOrEmpty } from '../../lib/api';
// local modules
import type { RaidBoss } from '../../types';

/**
 * Open to anyone, signed in or not. The catalogue describes the game rather
 * than any community's records, so no token is read here and `proxy.ts` lets
 * the path through without a session.
 */
export default async function RaidBossesPage() {
  const { data } = await loadOrEmpty<{ data: RaidBoss[] }>(() => getRaidBossList(), { data: [] });

  return <RaidBossList list={data} />;
}
