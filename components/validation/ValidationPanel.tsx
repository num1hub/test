'use client';

import type { ValidationIssue } from '@/lib/validator/types';
import ValidationBadge from '@/components/validation/ValidationBadge';

export interface ValidationPanelResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  computedHash?: string;
  appliedFixes?: string[];
}

interface ValidationPanelProps {
  result: ValidationPanelResult | null;
  loading?: boolean;
  title?: string;
}

const GateIssueBlock = ({
  label,
  issues,
  tone,
}: {
  label: string;
  issues: ValidationIssue[];
  tone: 'error' | 'warning';
}) => {
  if (issues.length === 0) return null;

  const toneClass =
    tone === 'error'
      ? 'border-red-900/60 bg-red-950/30 text-red-200'
      : 'border-amber-900/60 bg-amber-950/30 text-amber-200';

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <ul className="space-y-2 text-sm">
        {issues.map((issue, idx) => (
          <li key={`${issue.gate}-${issue.path}-${idx}`} className="rounded border border-current/20 p-2">
            <div className="mb-1 flex items-center gap-2 text-xs font-mono opacity-90">
              <span>{issue.gate}</span>
              <span>{issue.path}</span>
            </div>
            <p>{issue.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ValidationPanel({ result, loading = false, title = 'Validation Results' }: ValidationPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Running validation...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        No validation run yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <ValidationBadge
          valid={result.valid}
          warnings={result.warnings.length}
          errors={result.errors.length}
        />
      </div>

      {result.computedHash && (
        <p className="break-all rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-400">
          computed_sha3_512: {result.computedHash}
        </p>
      )}

      {result.appliedFixes && result.appliedFixes.length > 0 && (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm text-emerald-200">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider">Auto-fixes applied</p>
          <ul className="space-y-1">
            {result.appliedFixes.map((fix) => (
              <li key={fix} className="font-mono text-xs">
                {fix}
              </li>
            ))}
          </ul>
        </div>
      )}

      <GateIssueBlock label="Errors" issues={result.errors} tone="error" />
      <GateIssueBlock label="Warnings" issues={result.warnings} tone="warning" />
    </div>
  );
}
