'use client';

import type { DiffResult } from '@/contracts/diff';
import { CAPSULE_TIERS, capsuleTierBadgeClass, formatCapsuleTier } from '@/lib/capsuleTier';
import { buildDiffTierInsights } from '@/lib/tierAnalytics';

interface DiffViewerProps {
  diff: DiffResult;
  isOpen: boolean;
  onClose: () => void;
}

type IconProps = { className?: string };

function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getTierTransitionTone(direction: ReturnType<typeof buildDiffTierInsights>['transitions'][number]['direction']): string {
  switch (direction) {
    case 'elevated':
      return 'border-red-900/40 bg-red-950/20 text-red-300';
    case 'assigned':
      return 'border-emerald-900/40 bg-emerald-950/20 text-emerald-300';
    case 'deferred':
      return 'border-amber-900/40 bg-amber-950/20 text-amber-300';
    case 'cleared':
      return 'border-slate-700 bg-slate-900 text-slate-300';
    default:
      return 'border-slate-700 bg-slate-900 text-slate-300';
  }
}

function formatChangeValue(path: string, value: unknown): string {
  if (path === '$.metadata.tier') return formatCapsuleTier(value);
  return formatValue(value);
}

export default function DiffViewer({ diff, isOpen, onClose }: DiffViewerProps) {
  if (!isOpen) return null;

  const tierInsights = buildDiffTierInsights(diff);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Structured Branch Diff</h2>
            <p className="mt-1 text-sm text-slate-400">
              {diff.branchA} → {diff.branchB} · {diff.scope.scopeType ?? 'vault'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <span>Added: {diff.metrics.addedCount}</span>
              <span>Removed: {diff.metrics.removedCount}</span>
              <span>Modified: {diff.metrics.modifiedCount}</span>
              <span>Links: {diff.linkChanges.length}</span>
              <span>Semantic Events: {diff.metrics.semanticEventCount}</span>
              <span>Impact: {diff.metrics.estimatedTimeImpactHours.toFixed(1)}h</span>
            </div>
            {diff.summary && <p className="mt-3 text-sm text-slate-400">{diff.summary}</p>}
          </section>

          <section className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Tier Diff</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Strategic criticality changes across {diff.branchA} and {diff.branchB}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-red-900/40 bg-red-950/20 px-2 py-1 text-red-300">
                  Elevated: {tierInsights.elevatedCount}
                </span>
                <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-2 py-1 text-amber-300">
                  Deferred: {tierInsights.deferredCount}
                </span>
                <span className="rounded-full border border-emerald-900/40 bg-emerald-950/20 px-2 py-1 text-emerald-300">
                  Assigned: {tierInsights.assignedCount}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300">
                  Cleared: {tierInsights.clearedCount}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {CAPSULE_TIERS.map((tier) => (
                <div key={tier} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                  <div
                    className={`inline-flex rounded-full border px-2 py-1 text-xs font-mono ${capsuleTierBadgeClass(
                      tier,
                    )}`}
                  >
                    {formatCapsuleTier(tier)}
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Added</dt>
                      <dd>{tierInsights.addedCounts[tier]}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Changed Surface</dt>
                      <dd>{tierInsights.changedSurfaceCounts[tier]}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Incoming</dt>
                      <dd>{tierInsights.incomingCounts[tier]}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-400">Outgoing</dt>
                      <dd>{tierInsights.outgoingCounts[tier]}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {tierInsights.transitions.length === 0 ? (
                <p className="text-sm text-slate-500">No explicit tier transitions in this diff.</p>
              ) : (
                <div className="space-y-2">
                  {tierInsights.transitions.map((transition) => (
                    <div
                      key={transition.capsuleId}
                      className={`rounded-lg border p-3 ${getTierTransitionTone(transition.direction)}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm">{transition.capsuleId}</span>
                        {transition.capsuleType && (
                          <span className="rounded-full border border-current/30 px-2 py-0.5 text-[11px]">
                            {transition.capsuleType}
                          </span>
                        )}
                        <span className="rounded-full border border-current/30 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                          {transition.direction}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{transition.summary}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full border px-2 py-1 ${capsuleTierBadgeClass(transition.fromTier)}`}>
                          {formatCapsuleTier(transition.fromTier)}
                        </span>
                        <span className="text-slate-400">to</span>
                        <span className={`rounded-full border px-2 py-1 ${capsuleTierBadgeClass(transition.toTier)}`}>
                          {formatCapsuleTier(transition.toTier)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Added Capsules</h3>
            {diff.added.length === 0 ? (
              <p className="text-sm text-slate-500">No added capsules.</p>
            ) : (
              <div className="space-y-3">
                {diff.added.map((capsule) => (
                  <div key={capsule.metadata.capsule_id} className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-mono text-sm text-emerald-300">{capsule.metadata.capsule_id}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-mono ${capsuleTierBadgeClass(capsule.metadata.tier)}`}>
                        {formatCapsuleTier(capsule.metadata.tier)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-300">{capsule.neuro_concentrate.summary ?? capsule.metadata.name ?? 'No summary'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Removed Capsules</h3>
            {diff.removed.length === 0 ? (
              <p className="text-sm text-slate-500">No removed capsules.</p>
            ) : (
              <div className="space-y-3">
                {diff.removed.map((capsule) => (
                  <div key={capsule.id} className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4">
                    <div className="font-mono text-sm text-rose-300">{capsule.id}</div>
                    <div className="mt-1 text-sm text-slate-300">{capsule.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Modified Capsules</h3>
            {diff.modified.length === 0 ? (
              <p className="text-sm text-slate-500">No modified capsules.</p>
            ) : (
              <div className="space-y-4">
                {diff.modified.map((node) => (
                  <div key={node.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm text-amber-300">{node.id}</span>
                      {node.capsuleType && (
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {node.capsuleType}
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-mono ${capsuleTierBadgeClass(
                          node.after?.metadata?.tier ?? node.before?.metadata?.tier,
                        )}`}
                      >
                        {formatCapsuleTier(node.after?.metadata?.tier ?? node.before?.metadata?.tier)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{node.summary}</p>

                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm">
                        <thead className="bg-slate-950 text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Path</th>
                            <th className="px-3 py-2 text-left">Before</th>
                            <th className="px-3 py-2 text-left">After</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {node.changes.map((change) => (
                            <tr
                              key={`${node.id}-${change.path}`}
                              className={change.path === '$.metadata.tier' ? 'bg-amber-950/10' : undefined}
                            >
                              <td className="px-3 py-2 font-mono text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{change.path}</span>
                                  {change.path === '$.metadata.tier' && (
                                    <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                                      tier-shift
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top whitespace-pre-wrap text-xs">{formatChangeValue(change.path, change.oldValue)}</td>
                              <td className="px-3 py-2 align-top whitespace-pre-wrap text-xs">{formatChangeValue(change.path, change.newValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {node.semanticEvents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {node.semanticEvents.map((event) => (
                          <span key={`${node.id}-${event.type}-${event.path ?? ''}`} className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                            {event.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Link Changes</h3>
            {diff.linkChanges.length === 0 ? (
              <p className="text-sm text-slate-500">No link changes.</p>
            ) : (
              <div className="space-y-2">
                {diff.linkChanges.map((change, index) => (
                  <div key={`${change.source}-${change.target}-${change.relation}-${index}`} className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-3 text-sm text-slate-300">
                    <span className="font-mono text-sky-300">{change.source}</span> {change.change} <span className="font-mono text-sky-300">{change.target}</span> via <span className="font-mono">{change.relation}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {diff.conflicts && diff.conflicts.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-3 text-lg font-semibold text-slate-100">Conflicts</h3>
              <div className="space-y-2">
                {diff.conflicts.map((conflict) => (
                  <div key={`${conflict.capsuleId}-${conflict.path}`} className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-slate-300">
                    <div className="font-mono text-amber-300">{conflict.capsuleId}</div>
                    <div className="mt-1">{conflict.message}</div>
                    <div className="mt-1 text-xs text-slate-400">{conflict.path}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Action Plan</h3>
            {diff.actionPlan.length === 0 ? (
              <p className="text-sm text-slate-500">No action items.</p>
            ) : (
              <div className="space-y-2">
                {diff.actionPlan.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{task.kind}</span>
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">{task.priority}</span>
                      <span className="text-sm text-slate-100">{task.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{task.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <details className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-200">Raw JSON Debug</summary>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
                {JSON.stringify(diff, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
