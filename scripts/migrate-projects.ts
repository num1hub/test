#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { deriveDisplayName } from '../lib/projectUtils';
import { computeIntegrityHash, isRecordObject } from '../lib/validator/utils';

const CAPSULES_DIR = path.join(process.cwd(), 'data', 'capsules');

const backupCapsules = (sourceDir: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'data', `capsules_backup_projects_${timestamp}`);
  fs.cpSync(sourceDir, backupDir, { recursive: true });
  return backupDir;
};

const looksLikeProjectByConvention = (capsule: Record<string, unknown>): boolean => {
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  const neuro = isRecordObject(capsule.neuro_concentrate) ? capsule.neuro_concentrate : null;
  const keywords = Array.isArray(neuro?.keywords) ? neuro.keywords : [];

  const capsuleId = typeof metadata?.capsule_id === 'string' ? metadata.capsule_id : '';
  const type = typeof metadata?.type === 'string' ? metadata.type : '';
  const subtype = typeof metadata?.subtype === 'string' ? metadata.subtype : '';

  return (
    capsuleId.startsWith('capsule.project.') ||
    type === 'project' ||
    (type === 'foundation' && subtype === 'hub' && keywords.includes('project'))
  );
};

const migrate = (): void => {
  if (!fs.existsSync(CAPSULES_DIR)) {
    throw new Error(`Capsules directory not found: ${CAPSULES_DIR}`);
  }

  const backupDir = backupCapsules(CAPSULES_DIR);
  process.stdout.write(`Backup created at ${backupDir}\n`);

  const files = fs
    .readdirSync(CAPSULES_DIR)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.dream.json'));

  let migrated = 0;

  for (const file of files) {
    const filePath = path.join(CAPSULES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const capsule = JSON.parse(raw) as unknown;
    if (!isRecordObject(capsule)) continue;
    if (!looksLikeProjectByConvention(capsule)) continue;

    const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
    if (!metadata || typeof metadata.capsule_id !== 'string') continue;

    const previousType = metadata.type;
    const previousSubtype = metadata.subtype;
    const previousName = metadata.name;

    metadata.type = 'project';
    metadata.subtype = 'hub';
    metadata.name =
      typeof previousName === 'string' && previousName.trim().length > 0
        ? previousName
        : deriveDisplayName(metadata.capsule_id);
    metadata.updated_at = new Date().toISOString();

    capsule.integrity_sha3_512 = computeIntegrityHash(capsule);

    const changed =
      previousType !== metadata.type ||
      previousSubtype !== metadata.subtype ||
      previousName !== metadata.name;

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(capsule, null, 2), 'utf-8');
      process.stdout.write(`Migrated: ${metadata.capsule_id}\n`);
      migrated += 1;
    }
  }

  process.stdout.write(`Migration complete. ${migrated} capsule(s) updated.\n`);
};

try {
  migrate();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Migration failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
