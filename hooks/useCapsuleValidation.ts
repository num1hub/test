'use client';

import { useEffect, useState } from 'react';
import { getClientJsonAuthHeaders } from '@/lib/clientAuth';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { SovereignCapsule } from '@/types/capsule';
import type { ValidationPanelResult } from '@/components/validation/ValidationPanel';

export function useCapsuleValidation(
  capsuleId: string,
  capsule: SovereignCapsule | null,
) {
  const setValidationStatus = useCapsuleStore((state) => state.setValidationStatus);
  const [validationResult, setValidationResult] = useState<ValidationPanelResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => {
    if (!capsule) {
      setValidationResult(null);
      return;
    }

    const runValidation = async () => {
      try {
        setValidationLoading(true);
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: getClientJsonAuthHeaders(),
          body: JSON.stringify({ capsule }),
        });

        if (!response.ok) return;

        const result = (await response.json()) as ValidationPanelResult;
        setValidationResult(result);
        setValidationStatus(capsuleId, {
          valid: result.valid,
          warnings: result.warnings.length,
          errors: result.errors.length,
        });
      } finally {
        setValidationLoading(false);
      }
    };

    void runValidation();
  }, [capsule, capsuleId, setValidationStatus]);

  return {
    validationResult,
    validationLoading,
  };
}
