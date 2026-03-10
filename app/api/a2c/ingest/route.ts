import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { stageOperatorInput } from '@/lib/a2c/ingest';
import { CAPSULES_DIR, ensureCapsulesDir, getExistingCapsuleIds } from '@/lib/capsuleVault';
import { dataPath } from '@/lib/dataPath';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';

interface IngestBody {
  capsules?: unknown[];
  capsule?: unknown;
  autoFix?: boolean;
  operatorInput?: {
    text?: unknown;
    source?: {
      channel?: unknown;
      actor?: unknown;
      metadata?: unknown;
    };
  };
}

const QUARANTINE_DIR = dataPath('quarantine');

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

const extractCapsuleId = (capsule: unknown): string | null => {
  if (!isRecordObject(capsule)) return null;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || typeof metadata.capsule_id !== 'string') return null;
  return metadata.capsule_id;
};

const ensureQuarantineDir = async (): Promise<void> => {
  try {
    await fs.access(QUARANTINE_DIR);
  } catch {
    await fs.mkdir(QUARANTINE_DIR, { recursive: true });
  }
};

async function quarantineCapsule(capsule: unknown, reason: string, errors: ValidationIssue[]): Promise<string> {
  await ensureQuarantineDir();

  const capsuleId = extractCapsuleId(capsule) ?? `unknown-${Date.now()}`;
  const safeId = path.basename(capsuleId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${safeId}.${timestamp}.json`;

  const payload = {
    quarantined_at: new Date().toISOString(),
    reason,
    errors,
    capsule,
  };

  await fs.writeFile(path.join(QUARANTINE_DIR, fileName), JSON.stringify(payload, null, 2), 'utf-8');
  return fileName;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as IngestBody;
    const operatorInput = isRecordObject(body.operatorInput) ? body.operatorInput : null;
    const operatorText = operatorInput && typeof operatorInput.text === 'string' ? operatorInput.text.trim() : '';

    if (operatorText) {
      const source = isRecordObject(operatorInput?.source) ? operatorInput.source : null;
      const staged = await stageOperatorInput(process.cwd(), {
        text: operatorText,
        source: {
          channel: typeof source?.channel === 'string' ? (source.channel as 'api' | 'chat' | 'cli' | 'unknown') : 'api',
          actor: typeof source?.actor === 'string' ? source.actor : undefined,
          metadata: isRecordObject(source?.metadata) ? source.metadata : undefined,
        },
      });

      await logActivity('import', {
        message: 'A2C operator input staged for normalization.',
        intake_id: staged.intake_id,
        route_class_hint: staged.normalized.route_class_hint,
      });

      return NextResponse.json(
        {
          intake: staged,
          summary: {
            status: 'normalized',
            task_refs: staged.normalized.task_refs.length,
            verification_hints: staged.normalized.verification_hints.length,
          },
        },
        { status: 202 },
      );
    }

    const capsules = Array.isArray(body.capsules)
      ? body.capsules
      : body.capsule !== undefined
        ? [body.capsule]
        : [];

    if (capsules.length === 0) {
      return NextResponse.json({ error: 'A2C ingest requires one or more capsule candidates.' }, { status: 400 });
    }

    await ensureCapsulesDir();
    const existingIds = await getExistingCapsuleIds();

    const stored: string[] = [];
    const quarantined: Array<{ capsule_id: string | null; file: string; reason: string }> = [];

    for (const candidate of capsules) {
      const capsuleId = extractCapsuleId(candidate);
      let capsule = candidate;

      let result = await validateCapsule(capsule, { existingIds });

      const shouldTryFix = body.autoFix !== false;
      if (shouldTryFix && !result.valid && result.errors.every((issue) => isFixableGate(issue.gate))) {
        const fixed = autoFixCapsule(capsule);
        capsule = fixed.fixedData;
        result = await validateCapsule(capsule, { existingIds });
      }

      await appendValidationLog({
        capsule_id: capsuleId,
        source: 'a2c',
        success: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      });

      if (result.valid) {
        const safeId = path.basename(capsuleId ?? `generated-${Date.now()}`);
        const outputPath = path.join(CAPSULES_DIR, `${safeId}.json`);
        await fs.writeFile(outputPath, JSON.stringify(capsule, null, 2), 'utf-8');
        stored.push(safeId);
        existingIds.add(safeId);
        continue;
      }

      const reason = result.errors.map((issue) => `${issue.gate}:${issue.message}`).slice(0, 3).join(' | ');
      const quarantineFile = await quarantineCapsule(capsule, reason, result.errors);
      quarantined.push({ capsule_id: capsuleId, file: quarantineFile, reason });
    }

    await logActivity('import', {
      message: 'A2C ingest validation completed.',
      stored: stored.length,
      quarantined: quarantined.length,
    });

    const status = quarantined.length > 0 ? 207 : 200;
    return NextResponse.json(
      {
        stored,
        quarantined,
        summary: {
          total: capsules.length,
          stored: stored.length,
          quarantined: quarantined.length,
        },
      },
      { status },
    );
  } catch {
    return NextResponse.json({ error: 'A2C ingest failed due to invalid payload or storage error.' }, { status: 500 });
  }
}
