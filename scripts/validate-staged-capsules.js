#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const run = (command) => execSync(command, { encoding: 'utf-8' }).trim();

const CAPSULES_DIR = path.join(process.cwd(), 'data', 'capsules');

function listRealCapsuleFiles() {
  if (!fs.existsSync(CAPSULES_DIR)) return [];
  return fs
    .readdirSync(CAPSULES_DIR)
    .filter((file) => file.endsWith('.json'))
    .filter((file) => !file.includes('@'))
    .filter((file) => !file.endsWith('.dream.json'))
    .filter((file) => !file.endsWith('.tombstone.json'))
    .map((file) => path.join(CAPSULES_DIR, file));
}

function buildKnownIdsFile() {
  const ids = listRealCapsuleFiles()
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .map((capsule) => capsule?.metadata?.capsule_id)
    .filter((id) => typeof id === 'string' && id.length > 0)
    .sort();

  const idsFile = path.join(os.tmpdir(), `n1hub-staged-capsule-ids-${process.pid}.json`);
  fs.writeFileSync(idsFile, JSON.stringify(ids, null, 2));
  return idsFile;
}

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
const idsFile = buildKnownIdsFile();

for (const file of stagedFiles) {
  const result = spawnSync('npx', ['tsx', 'scripts/validate-cli.ts', '--strict', file, '--ids-file', idsFile], {
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

try {
  fs.unlinkSync(idsFile);
} catch {
  // Best effort cleanup.
}

console.log('Staged capsules passed validation.');
process.exit(0);
