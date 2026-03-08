#!/usr/bin/env tsx
import process from 'process';
import { runVaultStewardDaemon } from '@/lib/agents/vaultSteward';

const once = process.argv.slice(2).includes('--once');

runVaultStewardDaemon({ once }).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Vault Steward failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
