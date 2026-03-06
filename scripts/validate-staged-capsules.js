#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync, spawnSync } = require('child_process');

const run = (command) => execSync(command, { encoding: 'utf-8' }).trim();

let staged;
try {
  staged = run('git diff --cached --name-only --diff-filter=ACMR');
} catch (error) {
  console.error('Failed to read staged files:', error.message);
  process.exit(1);
}

const stagedFiles = staged
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => file.endsWith('.json'))
  .filter((file) => file.startsWith('data/capsules/'))
  .filter((file) => {
    const name = file.replace(/^data\/capsules\//, '');
    if (name.endsWith('.dream.json')) return false;
    if (name.endsWith('.tombstone.json')) return false;
    return !name.includes('@');
  });

if (stagedFiles.length === 0) {
  process.exit(0);
}

console.log(`Validating ${stagedFiles.length} staged capsule file(s)...`);

let hasFailures = false;

for (const file of stagedFiles) {
  const result = spawnSync('npx', ['tsx', 'scripts/validate-cli.ts', '--strict', file], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    hasFailures = true;
  }
}

if (hasFailures) {
  console.error(
    'Commit blocked: one or more staged capsules failed validation. Run `npm run validate -- --fix` before committing.',
  );
  process.exit(1);
}

console.log('Staged capsules passed validation.');
process.exit(0);
