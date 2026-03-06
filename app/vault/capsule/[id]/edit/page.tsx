'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCapsuleStore } from '@/store/capsuleStore';
import { SovereignCapsule } from '@/types/capsule';
import { useToast } from '@/contexts/ToastContext';
import { normalizeBranchName } from '@/types/branch';
import { useDebounce } from '@/hooks/useDebounce';
import ValidationPanel, { type ValidationPanelResult } from '@/components/validation/ValidationPanel';

const REQUIRED_KEYS = [
  'metadata',
  'core_payload',
  'neuro_concentrate',
  'recursive_layer',
  'integrity_sha3_512',
] as const;

export default function EditCapsulePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateCapsuleLocally, setValidationStatus } = useCapsuleStore();
  const { showToast } = useToast();
  const branch = normalizeBranchName(searchParams.get('branch') ?? 'real') ?? 'real';

  const [jsonInput, setJsonInput] = useState('');
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationPanelResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debouncedInput = useDebounce(jsonInput, 600);

  const isRecordObject = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('n1hub_vault_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

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
      setIsValidating(true);

      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Validation failed');
      }

      const result = (await res.json()) as ValidationPanelResult;
      setValidationResult(result);
      hydrateValidationStatus(parsed, result);

      if (options.notify) {
        if (result.valid) showToast('Validation passed.', 'success');
        else showToast('Validation failed. Review gate errors.', 'error');
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
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchCapsule = async () => {
      try {
        const res = await fetch(`/api/capsules/${id}?branch=${branch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load capsule for editing.');

        const data = (await res.json()) as SovereignCapsule;
        setJsonInput(JSON.stringify(data, null, 2));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrorMsg(message);
      } finally {
        setLoadingFetch(false);
      }
    };

    fetchCapsule();
  }, [branch, id, router]);

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
      setIsValidating(true);

      const res = await fetch('/api/validate/fix', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Auto-fix failed');
      }

      const payload = (await res.json()) as ValidationPanelResult & { fixedCapsule?: unknown };
      setValidationResult(payload);
      if (payload.fixedCapsule) {
        setJsonInput(JSON.stringify(payload.fixedCapsule, null, 2));
        hydrateValidationStatus(payload.fixedCapsule, payload);
      }
      showToast('Auto-fix completed.', 'info');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Auto-fix failed';
      showToast(message, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpdate = async () => {
    if (!jsonInput.trim()) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format.');
      }

      const parsedRecord = parsed as Record<string, unknown>;
      const missingKeys = REQUIRED_KEYS.filter((key) => !(key in parsedRecord));
      if (missingKeys.length > 0) {
        throw new Error(`Validation Gate 01 Failed: Missing keys: ${missingKeys.join(', ')}`);
      }

      const metadata =
        parsedRecord.metadata && typeof parsedRecord.metadata === 'object'
          ? (parsedRecord.metadata as Record<string, unknown>)
          : null;
      if (!metadata || metadata.capsule_id !== id) {
        throw new Error('Modifying the capsule_id is prohibited in Edit mode.');
      }

      const validation = await runValidation(jsonInput, { notify: false });
      if (!validation || !validation.valid) {
        throw new Error(validation?.errors?.[0]?.message || 'Validation failed.');
      }

      const res = await fetch(`/api/capsules/${id}?branch=${branch}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: jsonInput,
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: string };
        throw new Error(errorData.error || 'Server rejected the update.');
      }

      const updatedCapsule = (await res.json()) as SovereignCapsule;
      if (branch === 'real') {
        updateCapsuleLocally(id, updatedCapsule);
      }
      showToast(
        `${branch === 'real' ? 'Capsule' : `${branch} branch`} updated successfully.`,
        'success',
      );
      router.push(`/vault/capsule/${id}?branch=${branch}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid JSON format';
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingFetch) {
    return <div className="p-8 text-center text-slate-400">Loading payload for editing...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/vault/capsule/${id}?branch=${branch}`}
            className="text-sm text-slate-400 transition-colors hover:text-amber-500"
          >
            &lt;- Cancel Edit
          </Link>
          <h1 className="flex items-center text-2xl font-bold text-slate-100">
            Modifying {branch === 'real' ? 'Real' : branch}:
            <span className="ml-2 font-mono text-lg text-slate-400">{id}</span>
          </h1>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <p className="mb-4 text-sm text-slate-400">
            Caution: Bypassing A2C pipeline. Ensure payload adheres strictly to the 5-Element Law.
            Modifying <code className="text-slate-300">capsule_id</code> is restricted.
          </p>

          <textarea
            className="h-[600px] w-full rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono leading-relaxed text-emerald-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            spellCheck={false}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => void runValidation(jsonInput, { notify: true })}
              disabled={isValidating || !jsonInput.trim()}
              className="rounded border border-emerald-700 bg-emerald-700/20 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-700/30 disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </button>
            <button
              onClick={() => void handleAutoFix()}
              disabled={isValidating || !jsonInput.trim()}
              className="rounded border border-amber-700 bg-amber-700/20 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-700/30 disabled:opacity-50"
            >
              Auto-fix
            </button>
          </div>

          <div className="mt-4">
            <ValidationPanel result={validationResult} loading={isValidating} title="Live Validation" />
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
              <strong className="font-bold text-red-400">Error:</strong> {errorMsg}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpdate}
              disabled={isSaving || !jsonInput.trim()}
              className="rounded-lg bg-amber-600 px-8 py-3 font-bold text-white shadow-lg shadow-amber-900/20 transition-all hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Overwriting Record...' : `Save ${branch === 'real' ? 'Capsule' : branch}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
