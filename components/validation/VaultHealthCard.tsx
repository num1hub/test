'use client';

import { useEffect, useMemo, useState } from 'react';

interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  warned: number;
}

interface ValidationStatsResponse {
  total: number;
  passed: number;
  failed: number;
  warned: number;
  passRate: number;
  trend: TrendPoint[];
}

export default function VaultHealthCard() {
  const [stats, setStats] = useState<ValidationStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('n1hub_vault_token');
        const res = await fetch('/api/validate/stats?limit=1000', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setStats(null);
          return;
        }

        const data = (await res.json()) as ValidationStatsResponse;
        setStats(data);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const compactTrend = useMemo(() => {
    if (!stats) return [];
    return stats.trend.slice(-10);
  }, [stats]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Loading validation health...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Validation health is unavailable.
      </div>
    );
  }

  const passPercent = Math.round(stats.passRate * 10000) / 100;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Vault Health</h3>
        <span className="rounded border border-emerald-800 bg-emerald-950/30 px-2 py-1 font-mono text-xs text-emerald-300">
          {passPercent}% pass
        </span>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded border border-slate-800 bg-slate-950 p-2">
          <p className="font-mono text-slate-200">{stats.total}</p>
          <p className="text-slate-500">Runs</p>
        </div>
        <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2">
          <p className="font-mono text-emerald-300">{stats.passed}</p>
          <p className="text-emerald-500/80">Pass</p>
        </div>
        <div className="rounded border border-red-900/50 bg-red-950/20 p-2">
          <p className="font-mono text-red-300">{stats.failed}</p>
          <p className="text-red-500/80">Fail</p>
        </div>
        <div className="rounded border border-amber-900/50 bg-amber-950/20 p-2">
          <p className="font-mono text-amber-300">{stats.warned}</p>
          <p className="text-amber-500/80">Warn</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-slate-500">10-Day Trend</p>
        <div className="flex h-20 items-end gap-1 rounded border border-slate-800 bg-slate-950 p-2">
          {compactTrend.length === 0 ? (
            <p className="text-xs text-slate-500">No trend data yet.</p>
          ) : (
            compactTrend.map((point) => {
              const total = point.passed + point.failed;
              const height = total === 0 ? 4 : Math.max(6, Math.round((point.passed / total) * 64));
              const color = point.failed > 0 ? 'bg-red-500' : point.warned > 0 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div
                  key={point.date}
                  className="group relative flex-1"
                  title={`${point.date}: ${point.passed} passed, ${point.failed} failed, ${point.warned} warned`}
                >
                  <div className={`w-full rounded-sm ${color}`} style={{ height }} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
