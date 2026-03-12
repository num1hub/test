// @anchor interface:app.landing-entry links=arch:app.root-layout,doc:n1hub.readme,interface:api.deploy-smoke note="Auth-aware root entry that serves a locked deployment gate to guests and the workspace shell to authenticated operators."
import { cookies } from 'next/headers';
import AccessGateLanding from '@/components/home/AccessGateLanding';
import WorkspaceCapsuleGrid from '@/components/home/WorkspaceCapsuleGrid';
import { AUTH_COOKIE_NAME, getSessionFromToken } from '@/lib/apiSecurity';
import { isDeployAuthConfigured, isProductionDeployAuthMode } from '@/lib/deployAuth';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = getSessionFromToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  const deployAuthMisconfigured = isProductionDeployAuthMode() && !isDeployAuthConfigured();

  if (!session) {
    return <AccessGateLanding deployAuthMisconfigured={deployAuthMisconfigured} />;
  }

  const ownerLabel = session.sub === 'egor-n1' ? 'Egor N1' : session.sub;
  const ownerProfileId =
    session.sub === 'egor-n1' ? 'capsule.person.egor-n1.v1' : `session.${session.sub}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen w-full flex-col px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-5">
        <WorkspaceCapsuleGrid ownerLabel={ownerLabel} ownerProfileId={ownerProfileId} />
      </div>
    </main>
  );
}
