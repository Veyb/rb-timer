import { redirect } from 'next/navigation';

/**
 * `/invites` has no content of its own — the section opens on its code list,
 * the same way `/profile` opens on management.
 */
export default function InvitesPage() {
  redirect('/invites/codes');
}
