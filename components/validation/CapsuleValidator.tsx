'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import ValidationPanel, { type ValidationPanelResult } from '@/components/validation/ValidationPanel';
import { getClientJsonAuthHeaders } from '@/lib/clientAuth';

export default function CapsuleValidator() {
  const [jsonInput, setJsonInput] = useState('');
  const [result, setResult] = useState<ValidationPanelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const runValidate = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Validation request failed');
      }

      const data = (await res.json()) as ValidationPanelResult;
      setResult(data);

      if (data.valid) {
        showToast('Validation passed.', 'success');
      } else {
        showToast('Validation failed. Review gate errors below.', 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
      setResult(null);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runFix = async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonInput);
      const res = await fetch('/api/validate/fix', {
        method: 'POST',
        headers: getClientJsonAuthHeaders(),
        body: JSON.stringify({ capsule: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Fix request failed');
      }

      const data = (await res.json()) as ValidationPanelResult & { fixedCapsule?: unknown };
      setResult(data);
      if (data.fixedCapsule) {
        setJsonInput(JSON.stringify(data.fixedCapsule, null, 2));
      }
      showToast('Auto-fix completed. Re-run validation if needed.', 'info');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Fix failed';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Capsule Validator</h2>
        <div className="flex gap-2">
          <button
            onClick={runValidate}
            disabled={loading || !jsonInput.trim()}
            className="rounded border border-emerald-700 bg-emerald-700/20 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-700/30 disabled:opacity-50"
          >
            Validate
          </button>
          <button
            onClick={runFix}
            disabled={loading || !jsonInput.trim()}
            className="rounded border border-amber-700 bg-amber-700/20 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-700/30 disabled:opacity-50"
          >
            Fix
          </button>
        </div>
      </div>

      <textarea
        className="h-72 w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-emerald-300 outline-none focus:border-amber-500"
        value={jsonInput}
        onChange={(event) => setJsonInput(event.target.value)}
        placeholder='{ "metadata": { "capsule_id": "..." } }'
        spellCheck={false}
      />

      <ValidationPanel result={result} loading={loading} title="Capsule Validation" />
    </div>
  );
}
