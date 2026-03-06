interface ProgressBarProps {
  label: string;
  value: number;
  colorClass?: string;
}

export default function ProgressBar({
  label,
  value,
  colorClass = 'bg-amber-500',
}: ProgressBarProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const percentage = Math.min(Math.max(safeValue, 0), 1) * 100;

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-end justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-xs font-mono text-slate-500">{safeValue.toFixed(2)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full ${colorClass} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
