// global modules
import { JoinContent } from '../../components/join-content';

/**
 * The target of a shareable invite link, `/join?code=XXXX-XXXX-XXXX`.
 *
 * Nothing happens on arrival: the page pre-fills the code and the reader
 * presses the button. A link that redeemed on being opened would be a link
 * anyone could get someone else to follow.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { code } = await searchParams;

  return <JoinContent code={Array.isArray(code) ? (code[0] ?? '') : (code ?? '')} />;
}
