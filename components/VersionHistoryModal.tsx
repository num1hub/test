'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { VersionMeta } from '@/lib/versioning';
import type { SovereignCapsule } from '@/types/capsule';

interface VersionHistoryModalProps {
  capsuleId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: () => void | Promise<void>;
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

function HistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function RestoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 2v6h6" />
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    </svg>
  );
}

function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function WarningIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.6 1.8 18.4A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.6L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

const isSovereignCapsule = (input: unknown): input is SovereignCapsule => {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Record<string, unknown>;
  const metadata =
    candidate.metadata && typeof candidate.metadata === 'object'
      ? (candidate.metadata as Record<string, unknown>)
      : null;
  return Boolean(
    metadata?.capsule_id &&
      candidate.core_payload &&
      candidate.neuro_concentrate &&
      candidate.recursive_layer &&
      candidate.integrity_sha3_512,
  );
};

export default function VersionHistoryModal({
  capsuleId,
  isOpen,
  onClose,
  onRestoreComplete,
}: VersionHistoryModalProps) {
  const { showToast } = useToast();
  const { updateCapsuleLocally } = useCapsuleStore();

  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<SovereignCapsule | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setPreviewVersion(null);

    const fetchVersions = async () => {
      const token = localStorage.getItem('n1hub_vault_token');
      try {
        const res = await fetch(`/api/capsules/${capsuleId}/versions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load version history.');
        const data = (await res.json()) as VersionMeta[];
        setVersions(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load version history.';
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, capsuleId, showToast]);

  const handlePreview = async (timestamp: string) => {
    const token = localStorage.getItem('n1hub_vault_token');
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/versions/${timestamp}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load version payload.');
      const data = (await res.json()) as unknown;
      if (!isSovereignCapsule(data)) throw new Error('Invalid historical payload.');
      setPreviewVersion(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load version payload.';
      showToast(message, 'error');
    }
  };

  const handleRestore = async (timestamp: string) => {
    if (
      !confirm(
        'WARNING: Restoring this version will overwrite the current active state. The current state will be backed up to history. Proceed?',
      )
    ) {
      return;
    }

    setIsRestoring(timestamp);
    const token = localStorage.getItem('n1hub_vault_token');

    try {
      const res = await fetch(`/api/capsules/${capsuleId}/versions/${timestamp}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to restore version.');

      const data = (await res.json()) as unknown;
      if (!isSovereignCapsule(data)) throw new Error('Restored payload is invalid.');

      updateCapsuleLocally(capsuleId, data);
      showToast('Version restored successfully.', 'success');
      await onRestoreComplete();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore version.';
      showToast(message, 'error');
    } finally {
      setIsRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <h2 className="flex items-center text-xl font-bold text-slate-100">
            <HistoryIcon className="mr-2 h-5 w-5 text-amber-500" />
            Immutable History Log
          </h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <div className="w-full overflow-y-auto border-r border-slate-800 bg-slate-900/50 md:w-1/3">
            {loading ? (
              <div className="animate-pulse p-6 text-center text-slate-500">Decrypting history...</div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No historical records found.</div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {versions.map((version) => {
                  const dateObj = new Date(version.isoDate);
                  const displayDate = Number.isNaN(dateObj.getTime())
                    ? version.timestamp
                    : dateObj.toLocaleString();

                  return (
                    <li
                      key={version.timestamp}
                      className="group p-4 transition-colors hover:bg-slate-800"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <span className="break-all font-mono text-xs text-slate-400">{displayDate}</span>
                      </div>
                      <div className="mt-3 flex space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handlePreview(version.timestamp)}
                          className="flex flex-1 items-center justify-center rounded bg-slate-700 px-2 py-1.5 text-xs text-slate-200 transition-colors hover:bg-slate-600"
                        >
                          <EyeIcon className="mr-1 h-3 w-3" /> Preview
                        </button>
                        <button
                          onClick={() => handleRestore(version.timestamp)}
                          disabled={isRestoring === version.timestamp}
                          className="flex flex-1 items-center justify-center rounded border border-amber-800/50 bg-amber-900/40 px-2 py-1.5 text-xs text-amber-500 transition-colors hover:bg-amber-600 hover:text-white disabled:opacity-50"
                        >
                          <RestoreIcon className="mr-1 h-3 w-3" />
                          {isRestoring === version.timestamp ? '...' : 'Restore'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[#0d1117] p-6">
            {previewVersion ? (
              <div className="space-y-4">
                <div className="mb-4 flex items-center text-sm font-medium text-amber-500">
                  <WarningIcon className="mr-2 h-4 w-4" />
                  You are viewing a historical snapshot.
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <h3 className="mb-2 font-bold text-slate-300">Metadata State</h3>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm text-slate-400">
                    <div>Status: {String(previewVersion.metadata?.status ?? 'unknown')}</div>
                    <div>Version: {String(previewVersion.metadata?.version ?? 'unknown')}</div>
                    <div className="col-span-2 truncate text-xs text-green-500">
                      Seal: {previewVersion.integrity_sha3_512}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <h3 className="mb-2 font-bold text-slate-300">Historical Summary</h3>
                  <p className="text-sm text-slate-400">
                    {typeof previewVersion.neuro_concentrate?.summary === 'string'
                      ? previewVersion.neuro_concentrate.summary
                      : 'No summary available.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm italic text-slate-600">
                Select a version from the timeline to preview its state.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
