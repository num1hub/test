import {
  getMissingDeployAuthEnvLabelsForMode,
  getRequiredDeployAuthEnvLabels,
  type DeployAuthMode,
} from '@/lib/deployAuth';
import { getPrivateOwnerLoginPath } from '@/lib/authConfig';

function resolveMode(argv: string[]): DeployAuthMode {
  if (argv.includes('--development')) return 'development';
  return 'production';
}

function main() {
  const mode = resolveMode(process.argv.slice(2));
  const requiredEnv = getRequiredDeployAuthEnvLabels();
  const missingEnv = getMissingDeployAuthEnvLabelsForMode(mode);
  const ownerPath = getPrivateOwnerLoginPath();

  console.log('N1Hub Vercel Hobby Auth Check');
  console.log(`mode: ${mode}`);
  console.log(`required env: ${requiredEnv.join(', ')}`);

  if (missingEnv.length > 0) {
    console.log(`status: incomplete`);
    console.log(`missing env: ${missingEnv.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('status: ready');
  console.log(`owner route: ${ownerPath}`);
  console.log('smoke checks:');
  console.log('- open / and confirm the locked access gate renders');
  console.log('- open /api/deploy/smoke and confirm it returns 200 with ok=true');
  console.log(`- open ${ownerPath} and confirm the owner login form renders`);
  console.log('- open /vault in a private window and confirm it redirects back to /');
}

main();
