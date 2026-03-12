'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import type { ActivityEntry } from '@/lib/activity';
import { getClientAuthHeaders } from '@/lib/clientAuth';

type IconProps = { className?: string };

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
    </svg>
  );
}

function TrashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function UploadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 21V9" />
      <path d="m17 16-5 5-5-5" />
      <path d="M20 4H4" />
    </svg>
  );
}

function KeyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M12 15.5h9" />
      <path d="M18 12.5v6" />
      <path d="M15 13.5v4" />
    </svg>
  );
}

function LoginIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
    </svg>
  );
}

function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="m14 7-5 5 5 5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ActivityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  );
}

const isRecord = (input: unknown): input is Record<string, unknown> => {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
};

const isActivityEntry = (input: unknown): input is ActivityEntry => {
  if (!isRecord(input)) return false;
  return (
    typeof input.id === 'string' &&
    typeof input.timestamp === 'string' &&
    typeof input.action === 'string'
  );
};

export default function ActivityLog() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/activity?limit=100', {
          headers: getClientAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to fetch audit trail');

        const data = (await res.json()) as unknown;
        const parsed = Array.isArray(data) ? data.filter(isActivityEntry) : [];
        setLogs(parsed);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch audit trail';
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [showToast]);

  const getActionConfig = (action: ActivityEntry['action']) => {
    switch (action) {
      case 'create':
        return { icon: PlusIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'update':
        return { icon: EditIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'delete':
        return { icon: TrashIcon, color: 'text-red-500', bg: 'bg-red-500/10' };
      case 'import':
        return { icon: UploadIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'export':
        return { icon: DownloadIcon, color: 'text-violet-500', bg: 'bg-violet-500/10' };
      case 'password_change':
        return { icon: KeyIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'login':
        return { icon: LoginIcon, color: 'text-teal-500', bg: 'bg-teal-500/10' };
      case 'logout':
        return { icon: LogoutIcon, color: 'text-slate-400', bg: 'bg-slate-400/10' };
      default:
        return { icon: ActivityIcon, color: 'text-slate-500', bg: 'bg-slate-500/10' };
    }
  };

  const formatRelativeTime = (isoDate: string) => {
    const timestamp = new Date(isoDate).getTime();
    if (Number.isNaN(timestamp)) return 'Unknown';

    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return <div className="animate-pulse p-8 text-center text-slate-400">Loading telemetry...</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="flex items-center font-bold text-slate-800 dark:text-slate-200">
          <ActivityIcon className="mr-2 h-5 w-5 text-amber-500" />
          Audit Trail
        </h2>
        <span className="font-mono text-xs text-slate-500">{logs.length} records</span>
      </div>

      <div className="max-h-[600px] space-y-4 overflow-y-auto p-4">
        {logs.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No telemetry recorded.</div>
        ) : (
          logs.map((log) => {
            const { icon: Icon, color, bg } = getActionConfig(log.action);
            const capsuleId =
              log.details && typeof log.details.capsule_id === 'string'
                ? log.details.capsule_id
                : null;
            const message =
              log.details && typeof log.details.message === 'string' ? log.details.message : null;

            return (
              <div
                key={log.id}
                className="group flex items-start space-x-4 rounded-lg p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                <div className={`mt-1 rounded-full p-2 ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span
                      className="font-mono text-xs text-slate-400"
                      title={new Date(log.timestamp).toLocaleString()}
                    >
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>

                  {capsuleId && (
                    <div className="mb-1 truncate font-mono text-xs text-slate-500">
                      ID: {capsuleId}
                    </div>
                  )}

                  {message && <div className="text-sm text-slate-600 dark:text-slate-400">{message}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
