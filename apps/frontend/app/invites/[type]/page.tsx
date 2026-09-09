// global modules
import { notFound } from 'next/navigation';

// local modules
import { InvitesContent } from '../../../components/invites-content';

const KNOWN_TABS = ['codes', 'history'];

export default async function InvitesTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;

  if (!KNOWN_TABS.includes(type)) {
    notFound();
  }

  return <InvitesContent type={type} />;
}
