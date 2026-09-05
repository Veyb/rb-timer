import { redirect } from 'next/navigation';

export default async function UserByIdPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  redirect(`/users/${userId}/management`);
}
