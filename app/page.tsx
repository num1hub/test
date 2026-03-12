// @anchor interface:app.landing-entry links=arch:app.root-layout,doc:n1hub.readme note="Auth-aware root entry that serves the public N1Hub landing to guests and a temporary workspace shell to authenticated operators."
import { cookies } from 'next/headers';
import GuestLanding from '@/components/home/GuestLanding';
import WorkspaceCapsuleGrid from '@/components/home/WorkspaceCapsuleGrid';
import { AUTH_COOKIE_NAME, getSessionFromToken } from '@/lib/apiSecurity';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = getSessionFromToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return <GuestLanding />;
  }

  const ownerLabel = session.sub === 'egor-n1' ? 'Egor N1' : session.sub;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen w-full flex-col px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-5">
        <WorkspaceCapsuleGrid />
      </div>
    </main>
  );
}
