import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized, resolveRole } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds } from '@/lib/capsuleVault';
import { appendValidationLog } from '@/lib/validationLog';
import { validateCapsule } from '@/lib/validator';
import type { ValidatorOptions } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';

interface BatchRequestBody {
  capsules?: unknown[];
  options?: {
    skipG16?: boolean;
    customTokenLimit?: number;
    allowRefutes?: boolean;
    existingIds?: string[];
  };
}

const extractCapsuleId = (capsule: unknown): string | null => {
  if (!isRecordObject(capsule)) return null;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || typeof metadata.capsule_id !== 'string') return null;
  return metadata.capsule_id;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (resolveRole(request) !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 });
  }

  const rate = checkRateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as BatchRequestBody;
    const capsules = Array.isArray(body.capsules) ? body.capsules : [];

    if (capsules.length === 0) {
      return NextResponse.json({ error: 'Payload must include a non-empty capsules array' }, { status: 400 });
    }

    const existingIds =
      body.options?.existingIds && Array.isArray(body.options.existingIds)
        ? new Set(body.options.existingIds.filter((id) => typeof id === 'string'))
        : await getExistingCapsuleIds();

    const options: ValidatorOptions = {
      skipG16: body.options?.skipG16,
      customTokenLimit: body.options?.customTokenLimit,
      allowRefutes: body.options?.allowRefutes,
      existingIds,
    };

    const results = await Promise.all(
      capsules.map(async (capsule) => {
        const result = await validateCapsule(capsule, options);
        const capsuleId = extractCapsuleId(capsule);

        await appendValidationLog({
          capsule_id: capsuleId,
          source: 'batch',
          success: result.valid,
          errors: result.errors,
          warnings: result.warnings,
        });

        return {
          capsuleId,
          ...result,
        };
      }),
    );

    const summary = {
      total: results.length,
      valid: results.filter((result) => result.valid).length,
      invalid: results.filter((result) => !result.valid).length,
      withWarnings: results.filter((result) => result.warnings.length > 0).length,
      totalErrors: results.reduce((sum, result) => sum + result.errors.length, 0),
      totalWarnings: results.reduce((sum, result) => sum + result.warnings.length, 0),
    };

    await logActivity('other', {
      message: 'Batch validation executed via API.',
      ...summary,
    });

    return NextResponse.json({ summary, results });
  } catch {
    return NextResponse.json({ error: 'Bad Request: invalid batch payload' }, { status: 400 });
  }
}
