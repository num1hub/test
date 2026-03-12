'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCapsuleStore } from '@/store/capsuleStore';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import ValidationPanel, { type ValidationPanelResult } from '@/components/validation/ValidationPanel';
import CapsuleValidator from '@/components/validation/CapsuleValidator';
import { getClientJsonAuthHeaders } from '@/lib/clientAuth';

const isRecordObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

export default function NewCapsulePage() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationPanelResult | null>(null);
  const router = useRouter();
  const { addCapsuleLocally, setValidationStatus } = useCapsuleStore();
  const { showToast } = useToast();
  const debouncedInput = useDebounce(jsonInput, 600);

  const hydrateValidationStatus = (capsule: unknown, result: ValidationPanelResult): void => {
    if (!isRecordObject(capsule)) return;
    const metadata = isRecordObject(capsule.metadata) ? capsule.metadata : null;
    if (!metadata || typeof metadata.capsule_id !== 'string') return;

    setValidationStatus(metadata.capsule_id, {
      valid: result.valid,
      warnings: result.warnings.length,
      errors: result.errors.length,
    });
  };

  const runValidation = async (
    rawInput: string,
    options: { notify: boolean } = { notify: false },
  ): Promise<ValidationPanelResult | null> => {
    if (!rawInput.trim()) {
      setValidationResult(null);
      return null;
    }

    try {
      const parsed = JSON.parse(rawInput);
      setValidating(true);

      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string };
        throw new Error(errorData.error || 'Validation request failed');
      }

      const result = (await res.json()) as ValidationPanelResult;
      setValidationResult(result);
      hydrateValidationStatus(parsed, result);

      if (options.notify) {
        if (result.valid) showToast('Validation passed.', 'success');
        else showToast('Validation failed. Review gate errors below.', 'error');
      }

      return result;
    } catch (error: unknown) {
      if (options.notify) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        showToast(message, 'error');
      }
      setValidationResult(null);
      return null;
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setValidationResult(null);
      return;
    }
    void runValidation(debouncedInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput]);

  const handleAutoFix = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setValidating(true);

      const res = await fetch('/api/validate/fix', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string };
        throw new Error(errorData.error || 'Auto-fix request failed');
      }

      const data = (await res.json()) as ValidationPanelResult & { fixedCapsule?: unknown };
      setValidationResult(data);

      if (data.fixedCapsule) {
        setJsonInput(JSON.stringify(data.fixedCapsule, null, 2));
        hydrateValidationStatus(data.fixedCapsule, data);
      }

      showToast('Auto-fix completed.', 'info');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Auto-fix failed';
      showToast(message, 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleMint = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);

    try {
      const parsed = JSON.parse(jsonInput);
      const validation = await runValidation(jsonInput, { notify: false });

      if (!validation || !validation.valid) {
        const message = validation?.errors?.[0]?.message || 'Validation failed';
        throw new Error(message);
      }

      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify(parsed),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server rejected capsule');
      }

      const newCapsule = await res.json();
      addCapsuleLocally(newCapsule);
      showToast('Capsule successfully minted and sealed.', 'success');
      router.push(`/vault/capsule/${newCapsule.metadata.capsule_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Minting Failed: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-amber-500"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-slate-100">Mint Sovereign Capsule</h1>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <p className="mb-4 text-sm text-slate-400">
            Paste raw JSON adhering to the 5-Element Law.
          </p>
          <textarea
            className="h-96 w-full rounded border border-slate-700 bg-slate-950 p-4 font-mono text-emerald-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder='{ "metadata": { ... } }'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            spellCheck={false}
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => void runValidation(jsonInput, { notify: true })}
              disabled={validating || !jsonInput.trim()}
              className="rounded border border-emerald-700 bg-emerald-700/20 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-700/30 disabled:opacity-50"
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
            <button
              onClick={() => void handleAutoFix()}
              disabled={validating || !jsonInput.trim()}
              className="rounded border border-amber-700 bg-amber-700/20 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-700/30 disabled:opacity-50"
            >
              Auto-fix
            </button>
          </div>
          <div className="mt-4">
            <ValidationPanel result={validationResult} loading={validating} title="Live Validation" />
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleMint}
              disabled={loading || !jsonInput.trim()}
              className="rounded bg-amber-600 px-6 py-2 font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? 'Committing to Disk...' : 'Seal & Execute'}
            </button>
          </div>
        </div>

        <CapsuleValidator />
      </div>
    </div>
  );
}
