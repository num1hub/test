import { redirect } from 'next/navigation';
import PrivateOwnerLoginPage from '@/components/auth/PrivateOwnerLoginPage';
import { matchesPrivateOwnerRouteSlug } from '@/lib/authConfig';

export default async function PrivateOwnerLoginRoute({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolvedParams = await params;

  if (!matchesPrivateOwnerRouteSlug(resolvedParams.slug)) {
    redirect('/');
  }

  return <PrivateOwnerLoginPage />;
}
