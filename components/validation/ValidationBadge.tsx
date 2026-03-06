'use client';

interface ValidationBadgeProps {
  valid: boolean;
  warnings?: number;
  errors?: number;
  className?: string;
}

function BadgeIcon({ valid, hasWarnings }: { valid: boolean; hasWarnings: boolean }) {
  if (!valid) return <span aria-hidden>❌</span>;
  if (hasWarnings) return <span aria-hidden>⚠️</span>;
  return <span aria-hidden>✅</span>;
}

export default function ValidationBadge({
  valid,
  warnings = 0,
  errors = 0,
  className = '',
}: ValidationBadgeProps) {
  const hasWarnings = warnings > 0;

  const toneClass = !valid
    ? 'border-red-800 bg-red-950/40 text-red-300'
    : hasWarnings
      ? 'border-amber-800 bg-amber-950/30 text-amber-300'
      : 'border-emerald-800 bg-emerald-950/30 text-emerald-300';

  const label = !valid ? `${errors} error${errors === 1 ? '' : 's'}` : `${warnings} warning${warnings === 1 ? '' : 's'}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${toneClass} ${className}`}
      title={
        valid
          ? hasWarnings
            ? `Validation passed with ${warnings} warning(s).`
            : 'Validation passed.'
          : `Validation failed with ${errors} error(s).`
      }
    >
      <BadgeIcon valid={valid} hasWarnings={hasWarnings} />
      <span>{valid ? (hasWarnings ? 'WARN' : 'PASS') : 'FAIL'}</span>
      <span className="font-mono opacity-80">{label}</span>
    </span>
  );
}
