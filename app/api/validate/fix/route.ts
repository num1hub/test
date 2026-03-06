import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized, resolveRole } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds } from '@/lib/capsuleVault';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { AutoFixPolicy, ValidatorOptions } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';

interface FixRequestBody {
  capsule?: unknown;
  options?: {
    skipG16?: boolean;
    customTokenLimit?: number;
    allowRefutes?: boolean;
    existingIds?: string[];
  };
  policy?: AutoFixPolicy;
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

  const rate = checkRateLimit(request, { maxRequests: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as FixRequestBody;
    const capsule = body.capsule ?? body;

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

    const fixed = autoFixCapsule(capsule, body.policy);
    const result = await validateCapsule(fixed.fixedData, options);

    const capsuleId = extractCapsuleId(capsule);

    await appendValidationLog({
      capsule_id: capsuleId,
      source: 'api',
      success: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });

    await logActivity('other', {
      message: 'Capsule auto-fix executed via API.',
      capsule_id: capsuleId,
      applied_fixes: fixed.appliedFixes.length,
      success: result.valid,
    });

    return NextResponse.json({
      ...result,
      fixedCapsule: fixed.fixedData,
      appliedFixes: fixed.appliedFixes,
    });
  } catch {
    return NextResponse.json({ error: 'Bad Request: invalid fix payload' }, { status: 400 });
  }
}
