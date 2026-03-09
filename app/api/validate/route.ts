// @anchor arch:api.validate.route links=arch:validator.engine,interface:validator.public-api,doc:validator.reference note="Primary validator API boundary shared by app workflows and external callers."
import { NextResponse } from 'next/server';
import { checkRateLimit, isAuthorized } from '@/lib/apiSecurity';
import { logActivity } from '@/lib/activity';
import { getExistingCapsuleIds } from '@/lib/capsuleVault';
import { appendValidationLog } from '@/lib/validationLog';
import { autoFixCapsule, validateCapsule } from '@/lib/validator';
import type { ValidationIssue, ValidatorOptions } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';

interface ValidateRequestBody {
  capsule?: unknown;
  options?: {
    skipG16?: boolean;
    customTokenLimit?: number;
    allowRefutes?: boolean;
    existingIds?: string[];
  };
  autoFix?: boolean;
}

const isFixableGate = (gate: string): boolean => {
  return gate === 'G10' || gate === 'G11' || gate === 'G15' || gate === 'G16';
};

const extractCapsuleId = (capsule: unknown): string | null => {
  if (!isRecordObject(capsule)) return null;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || typeof metadata.capsule_id !== 'string') return null;
  return metadata.capsule_id;
};

const toValidatorOptions = async (
  bodyOptions: ValidateRequestBody['options'],
): Promise<ValidatorOptions> => {
  const options: ValidatorOptions = {
    skipG16: bodyOptions?.skipG16,
    customTokenLimit: bodyOptions?.customTokenLimit,
    allowRefutes: bodyOptions?.allowRefutes,
  };

  if (bodyOptions?.existingIds && Array.isArray(bodyOptions.existingIds)) {
    options.existingIds = new Set(bodyOptions.existingIds.filter((id) => typeof id === 'string'));
  } else {
    options.existingIds = await getExistingCapsuleIds();
  }

  return options;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(request, { maxRequests: 120, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as ValidateRequestBody;
    const capsule = body.capsule ?? body;
    const options = await toValidatorOptions(body.options);

    const result = await validateCapsule(capsule, options);

    let fixedCapsule: unknown | undefined;
    let appliedFixes: string[] | undefined;

    if (body.autoFix && !result.valid) {
      const onlyFixable = result.errors.every((error: ValidationIssue) => isFixableGate(error.gate));
      if (onlyFixable) {
        const fixed = autoFixCapsule(capsule);
        const revalidated = await validateCapsule(fixed.fixedData, options);

        fixedCapsule = fixed.fixedData;
        appliedFixes = fixed.appliedFixes;

        result.valid = revalidated.valid;
        result.errors = revalidated.errors;
        result.warnings = revalidated.warnings;
        result.computedHash = revalidated.computedHash;
        result.capsule = revalidated.capsule;
      }
    }

    const capsuleId = extractCapsuleId(capsule);
    await appendValidationLog({
      capsule_id: capsuleId,
      source: 'api',
      success: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });

    await logActivity('other', {
      message: 'Capsule validation executed via API.',
      capsule_id: capsuleId,
      success: result.valid,
      errors: result.errors.length,
      warnings: result.warnings.length,
    });

    return NextResponse.json({
      ...result,
      fixedCapsule,
      appliedFixes,
    });
  } catch {
    return NextResponse.json({ error: 'Bad Request: invalid validation payload' }, { status: 400 });
  }
}
