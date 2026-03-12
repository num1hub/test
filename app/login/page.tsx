import { redirect } from 'next/navigation';
import { PRIVATE_OWNER_LOGIN_PATH } from '@/lib/authConfig';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath =
    typeof resolvedSearchParams.next === 'string' && resolvedSearchParams.next
      ? `?next=${encodeURIComponent(resolvedSearchParams.next)}`
      : '';

  redirect(`${PRIVATE_OWNER_LOGIN_PATH}${nextPath}`);
}
