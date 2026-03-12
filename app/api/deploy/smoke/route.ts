// @anchor interface:api.deploy-smoke links=doc:n1hub.readme,interface:app.landing-entry note="Public deploy smoke surface that confirms locked-root posture and deploy-auth readiness without exposing the private owner route segment."
import { NextResponse } from 'next/server';
import { getDeploySmokeStatus } from '@/lib/deployAuth';

export async function GET() {
  const smoke = getDeploySmokeStatus();
  return NextResponse.json(smoke, { status: smoke.ok ? 200 : 503 });
}
