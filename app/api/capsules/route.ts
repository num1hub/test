import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds, readCapsulesFromDisk } from '@/lib/capsuleVault';
import { dataPath } from '@/lib/dataPath';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import { isRecordObject } from '@/lib/validator/utils';
import type { ValidationIssue } from '@/lib/validator/types';

function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader === 'Bearer n1-authorized-architect-token-777';
}

const getCapsulesDir = async () => {
  const dir = dataPath('capsules');
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
};

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const capsulesDir = await getCapsulesDir();
    const files = await fs.readdir(capsulesDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json') && !file.endsWith('.dream.json'));

    const capsules = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await fs.readFile(path.join(capsulesDir, file), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      }),
    );

    const filteredCapsules = capsules.filter(Boolean);
    if (!typeFilter) {
      return NextResponse.json(filteredCapsules);
    }

    return NextResponse.json(
      filteredCapsules.filter((capsule) => {
        if (!isRecordObject(capsule)) return false;
        const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
        return metadata?.type === typeFilter;
      }),
    );
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as unknown;
    if (!isRecordObject(body)) {
      return NextResponse.json({ error: 'Bad Request: Invalid JSON' }, { status: 400 });
    }

    const capsule = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
    const rawParentId = typeof capsule.parentId === 'string' ? capsule.parentId.trim() : '';
    if (rawParentId) {
      const allCapsules = await readCapsulesFromDisk();
      const parentExists = allCapsules.some((candidate) => {
        if (!isRecordObject(candidate)) return false;
        const metadata = isRecordObject(candidate.metadata) ? candidate.metadata : null;
        if (!metadata) return false;
        return (
          metadata.capsule_id === rawParentId &&
          metadata.type === 'project' &&
          metadata.subtype === 'hub'
        );
      });

      if (!parentExists) {
        return NextResponse.json(
          {
            error: `Invalid parentId "${rawParentId}". Parent project must exist and be type=project subtype=hub.`,
          },
          { status: 400 },
        );
      }

      if (!isRecordObject(capsule.recursive_layer)) {
        capsule.recursive_layer = { links: [] };
      }
      const recursiveLayer = capsule.recursive_layer as Record<string, unknown>;
      if (!Array.isArray(recursiveLayer.links)) {
        recursiveLayer.links = [];
      }

      const links = recursiveLayer.links as Array<Record<string, unknown>>;
      const alreadyLinked = links.some(
        (link) => link.relation_type === 'part_of' && link.target_id === rawParentId,
      );
      if (!alreadyLinked) {
        links.push({
          target_id: rawParentId,
          relation_type: 'part_of',
        });
      }
    }

    delete capsule.parentId;
    const existingIds = await getExistingCapsuleIds();

    let validation = await validateCapsule(capsule, { existingIds });
    let finalCapsule = capsule;

    if (!validation.valid && validation.errors.every((issue: ValidationIssue) => isFixableGate(issue.gate))) {
      const fixed = autoFixCapsule(capsule);
      finalCapsule = fixed.fixedData;
      validation = await validateCapsule(finalCapsule, { existingIds });
    }

    const finalCapsuleRecord = isRecordObject(finalCapsule) ? finalCapsule : null;
    const finalMetadata = isRecordObject(finalCapsuleRecord?.metadata)
      ? finalCapsuleRecord.metadata
      : null;
    const capsuleId = finalMetadata?.capsule_id;

    await appendValidationLog({
      capsule_id: typeof capsuleId === 'string' ? capsuleId : null,
      source: 'ui',
      success: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Capsule was not stored.',
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    if (typeof capsuleId !== 'string' || capsuleId.length === 0) {
      return NextResponse.json(
        {
          error: 'Validation passed but capsule_id is missing or invalid.',
        },
        { status: 400 },
      );
    }

    const safeId = path.basename(capsuleId);
    const capsulesDir = await getCapsulesDir();
    const filePath = path.join(capsulesDir, `${safeId}.json`);

    try {
      await fs.access(filePath);
      return NextResponse.json({ error: 'Conflict: Capsule ID already exists' }, { status: 409 });
    } catch {
      await fs.writeFile(filePath, JSON.stringify(finalCapsule, null, 2), 'utf-8');
      const type = typeof finalMetadata?.type === 'string' ? finalMetadata.type : 'unknown';
      await logActivity('create', { capsule_id: safeId, type });
      return NextResponse.json(finalCapsule, { status: 201 });
    }
  } catch {
    return NextResponse.json({ error: 'Bad Request: Invalid JSON' }, { status: 400 });
  }
}
