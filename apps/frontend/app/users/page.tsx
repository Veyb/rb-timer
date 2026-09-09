// global modules
import { UsersContent } from '../../components/users-content';
import { getCommunityMembers, loadOrEmpty } from '../../lib/api';
// local modules
import { getSessionToken } from '../../lib/dal';
import type { CommunityMember } from '../../types';

export default async function UsersPage() {
  const jwt = await getSessionToken();

  // No role list is fetched: the only thing this screen did with it was fill a
  // filter, and a filter's choices come from what it filters.
  const users = await loadOrEmpty<CommunityMember[]>(() => getCommunityMembers(jwt), []);

  return <UsersContent users={users} />;
}
