import type { ValidationContext, ValidationIssue } from '@/lib/validator/types';
import { CANONICAL_RELATION_TYPES } from '@/lib/validator/types';
import { isRecordObject } from '@/lib/validator/utils';
import { getCapsuleLinks } from '@/lib/validator/coreConfig';

const CANONICAL_RELATION_TYPE_SET = new Set<string>(CANONICAL_RELATION_TYPES);

export function validateRelationTypes(
  capsule: unknown,
  context: ValidationContext,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const links = getCapsuleLinks(capsule);
  if (!links) return;

  for (let index = 0; index < links.length; index += 1) {
    const relationType = links[index].relation_type;

    if (relationType === 'refutes') {
      if (!context.options.allowRefutes) {
        warnings.push({
          gate: 'G11',
          path: `$.recursive_layer.links[${index}].relation_type`,
          message: 'refutes is deprecated; use contradicts.',
        });
      }
      continue;
    }

    if (!CANONICAL_RELATION_TYPE_SET.has(relationType)) {
      errors.push({
        gate: 'G11',
        path: `$.recursive_layer.links[${index}].relation_type`,
        message: `Non-canonical relation_type "${relationType}".`,
      });
    }
  }
}

export async function validateTargetExistence(
  capsule: unknown,
  context: ValidationContext,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  canResolveTargets: boolean,
  targetExists: (targetId: string, existingIds?: Set<string>) => Promise<boolean>,
): Promise<void> {
  const links = getCapsuleLinks(capsule);
  if (!links || links.length === 0) return;

  const targetIds = links.map((link) => link.target_id);

  if (!context.options.existingIds && !canResolveTargets) {
    warnings.push({
      gate: 'G12',
      path: '$.recursive_layer.links',
      message: 'Target existence check skipped because no existingIds set or reference resolver was provided.',
    });
    return;
  }

  const results = await Promise.all(
    targetIds.map(async (targetId) => ({
      targetId,
      exists: await targetExists(targetId, context.options.existingIds),
    })),
  );

  results.forEach((result, index) => {
    if (!result.exists) {
      errors.push({
        gate: 'G12',
        path: `$.recursive_layer.links[${index}].target_id`,
        message: `Target capsule "${result.targetId}" does not exist in known IDs.`,
      });
    }
  });
}

export function validateLinkRequirement(capsule: unknown, errors: ValidationIssue[]): void {
  if (!isRecordObject(capsule)) return;
  const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
  if (!metadata || metadata.status === 'draft') return;

  const links = getCapsuleLinks(capsule);
  if (!links || links.length === 0) {
    errors.push({
      gate: 'G13',
      path: '$.recursive_layer.links',
      message: 'Non-draft capsules must include at least one outbound link.',
    });
  }
}
