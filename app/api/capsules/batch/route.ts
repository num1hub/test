import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logActivity } from '@/lib/activity';
import { dataPath } from '@/lib/dataPath';
import { getExistingCapsuleIds, parseBranchFilename } from '@/lib/capsuleVault';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';
import { isAuthorized } from '@/lib/apiSecurity';

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { capsules?: unknown; overwrite?: boolean };
    const capsules = body.capsules || [];
    const overwrite = body.overwrite || false;

    if (!Array.isArray(capsules)) {
      return NextResponse.json(
        { error: 'Payload must contain a "capsules" array' },
        { status: 400 },
      );
    }

    const dir = dataPath('capsules');
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    const existingIds = await getExistingCapsuleIds();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; message: string; validation?: ValidationIssue[] }> = [];
    const warnings: Array<{ id: string; warnings: ValidationIssue[] }> = [];

    for (const capsule of capsules) {
      if (!isRecordObject(capsule)) {
        skipped++;
        continue;
      }

      const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
      const id = metadata && typeof metadata.capsule_id === 'string' ? metadata.capsule_id : '';

      if (!id) {
        skipped++;
        continue;
      }

      let candidateCapsule: unknown = capsule;
      let validation = await validateCapsule(candidateCapsule, { existingIds });

      if (!validation.valid && validation.errors.every((issue) => isFixableGate(issue.gate))) {
        const fixed = autoFixCapsule(candidateCapsule);
        candidateCapsule = fixed.fixedData;
        validation = await validateCapsule(candidateCapsule, { existingIds });
      }

      await appendValidationLog({
        capsule_id: id,
        source: 'batch',
        success: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      });

      if (!validation.valid) {
        skipped++;
        errors.push({
          id,
          message: 'Validation failed',
          validation: validation.errors,
        });
        continue;
      }

      if (validation.warnings.length > 0) {
        warnings.push({ id, warnings: validation.warnings });
      }

      const safeId = path.basename(id);
      const filePath = path.join(dir, `${safeId}.json`);

      try {
        await fs.access(filePath);
        if (overwrite) {
          await fs.writeFile(filePath, JSON.stringify(candidateCapsule, null, 2), 'utf-8');
          updated++;
          existingIds.add(id);
        } else {
          skipped++;
        }
      } catch {
        try {
          await fs.writeFile(filePath, JSON.stringify(candidateCapsule, null, 2), 'utf-8');
          created++;
          existingIds.add(id);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to write capsule file';
          errors.push({ id, message });
        }
      }
    }

    await logActivity('import', {
      message: `Imported ${created}, Updated ${updated}, Skipped ${skipped}, Errors ${errors.length}, Warnings ${warnings.length}`,
      created,
      updated,
      skipped,
      errors: errors.length,
      warnings: warnings.length,
    });

    return NextResponse.json({ created, updated, skipped, errors, warnings }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { capsuleIds?: unknown };
    if (!Array.isArray(body.capsuleIds) || body.capsuleIds.length === 0) {
      return NextResponse.json(
        { error: 'Payload must contain a non-empty "capsuleIds" array' },
        { status: 400 },
      );
    }

    const capsuleIds = body.capsuleIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (capsuleIds.length === 0) {
      return NextResponse.json(
        { error: 'Payload must contain a non-empty "capsuleIds" array' },
        { status: 400 },
      );
    }

    const dir = dataPath('capsules');
    let deleted = 0;
    const deletedIds: string[] = [];
    const errors: Array<{ id: string; message: string }> = [];

    for (const id of capsuleIds) {
      const safeId = path.basename(id);
      const realPath = path.join(dir, `${safeId}.json`);
      let deletedForId = false;

      try {
        await fs.unlink(realPath);
        deletedForId = true;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          const message = error instanceof Error ? error.message : 'Failed to delete capsule';
          errors.push({ id, message });
          continue;
        }
      }

      const branchFiles = (await fs.readdir(dir))
        .filter((file) => {
          const parsed = parseBranchFilename(file);
          return parsed?.capsuleId === safeId && parsed.branch !== 'real';
        })
        .map((file) => path.join(dir, file));

      for (const branchFile of branchFiles) {
        try {
          await fs.unlink(branchFile);
          deletedForId = true;
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            const message = error instanceof Error ? error.message : 'Failed to delete branch file';
            errors.push({ id, message });
          }
        }
      }

      if (deletedForId) {
        deleted++;
        deletedIds.push(id);
        await logActivity('delete', { capsule_id: id, message: 'Batch deletion' });
      }
    }

    if (deleted > 0) {
      await logActivity('delete', { message: `Batch deleted ${deleted} capsules.` });
    }

    return NextResponse.json({ deleted, deletedIds, errors }, { status: 200 });
  } catch (error) {
    console.error('Batch Delete Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
