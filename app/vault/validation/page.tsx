'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ValidationBadge from '@/components/validation/ValidationBadge';
import type { ValidationIssue } from '@/lib/validator/types';

interface ValidationLogEntry {
  id: string;
  timestamp: string;
  capsule_id: string | null;
  source: 'api' | 'batch' | 'a2c' | 'cli' | 'audit' | 'ui';
  success: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface ValidationStatsResponse {
  total: number;
  passed: number;
  failed: number;
  warned: number;
  passRate: number;
  recent: ValidationLogEntry[];
  gates: Array<{ gate: string; count: number }>;
}

export default function ValidationLogPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ValidationStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'warn'>('all');
  const [gateFilter, setGateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const run = async () => {
      try {
        const res = await fetch('/api/validate/stats?limit=2000', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setStats(null);
          return;
        }

        const payload = (await res.json()) as ValidationStatsResponse;
        setStats(payload);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const filteredEntries = useMemo(() => {
    if (!stats) return [];

    return stats.recent.filter((entry) => {
      if (statusFilter === 'pass' && !entry.success) return false;
      if (statusFilter === 'fail' && entry.success) return false;
      if (statusFilter === 'warn' && entry.warnings.length === 0) return false;

      if (gateFilter !== 'all') {
        const hasGate = [...entry.errors, ...entry.warnings].some((issue) => issue.gate === gateFilter);
        if (!hasGate) return false;
      }

      if (startDate && entry.timestamp < `${startDate}T00:00:00.000Z`) return false;
      if (endDate && entry.timestamp > `${endDate}T23:59:59.999Z`) return false;

      return true;
    });
  }, [endDate, gateFilter, startDate, stats, statusFilter]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading validation log...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-400">Failed to load validation audit data.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/vault" className="text-sm text-slate-400 hover:text-amber-500">
            ← Back to Vault
          </Link>
          <ValidationBadge valid={stats.failed === 0} warnings={stats.warned} errors={stats.failed} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="mb-4 text-2xl font-bold text-slate-100">Validation Log</h1>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded border border-slate-800 bg-slate-950 p-3 text-center">
              <div className="font-mono text-lg text-slate-200">{stats.total}</div>
              <div className="text-xs text-slate-500">Total Runs</div>
            </div>
            <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-center">
              <div className="font-mono text-lg text-emerald-300">{stats.passed}</div>
              <div className="text-xs text-emerald-500/80">Pass</div>
            </div>
            <div className="rounded border border-red-900/40 bg-red-950/20 p-3 text-center">
              <div className="font-mono text-lg text-red-300">{stats.failed}</div>
              <div className="text-xs text-red-500/80">Fail</div>
            </div>
            <div className="rounded border border-amber-900/40 bg-amber-950/20 p-3 text-center">
              <div className="font-mono text-lg text-amber-300">{stats.warned}</div>
              <div className="text-xs text-amber-500/80">Warn</div>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            >
              <option value="all">All Status</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="warn">Warnings</option>
            </select>

            <select
              value={gateFilter}
              onChange={(event) => setGateFilter(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            >
              <option value="all">All Gates</option>
              {stats.gates.map((gate) => (
                <option key={gate.gate} value={gate.gate}>
                  {gate.gate} ({gate.count})
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Capsule</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900 text-slate-300">
                {filteredEntries.map((entry) => {
                  const issues = [...entry.errors, ...entry.warnings];
                  return (
                    <tr key={entry.id}>
                      <td className="px-3 py-2 font-mono text-xs">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-xs">{entry.capsule_id ?? 'unknown'}</td>
                      <td className="px-3 py-2 uppercase text-xs">{entry.source}</td>
                      <td className="px-3 py-2">
                        <ValidationBadge
                          valid={entry.success}
                          warnings={entry.warnings.length}
                          errors={entry.errors.length}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {issues.length === 0 ? (
                          <span className="text-xs text-slate-500">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {issues.slice(0, 5).map((issue, idx) => (
                              <span
                                key={`${entry.id}-${issue.gate}-${idx}`}
                                className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[10px]"
                                title={issue.message}
                              >
                                {issue.gate}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
