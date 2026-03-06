import { useState, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useCapsuleStore } from '@/store/capsuleStore';
import { SovereignCapsule } from '@/types/capsule';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.6 1.8 18.4A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.6L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

const isValidCapsule = (input: unknown): input is SovereignCapsule => {
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

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { showToast } = useToast();
  const { fetchCapsules } = useCapsuleStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedCapsules, setParsedCapsules] = useState<SovereignCapsule[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse((event.target?.result as string) || 'null') as unknown;
        const arr = Array.isArray(raw) ? raw : [raw];
        const valid = arr.filter(isValidCapsule);
        setParsedCapsules(valid);
        if (valid.length !== arr.length) {
          showToast(`Warning: Skipped ${arr.length - valid.length} invalid items.`, 'info');
        }
      } catch {
        showToast('Invalid JSON file format.', 'error');
        setFile(null);
        setParsedCapsules([]);
      }
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (parsedCapsules.length === 0) return;
    setIsImporting(true);

    try {
      const token = localStorage.getItem('n1hub_vault_token');
      const res = await fetch('/api/capsules/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ capsules: parsedCapsules, overwrite }),
      });

      if (!res.ok) throw new Error('Batch import failed server-side.');

      const result = (await res.json()) as {
        created: number;
        updated: number;
        skipped: number;
        errors: Array<{ id: string; message: string }>;
      };
      showToast(
        `Imported: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`,
        'success',
      );

      await fetchCapsules();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed.';
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
      setFile(null);
      setParsedCapsules([]);
      setOverwrite(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="flex items-center text-xl font-bold text-slate-100">
            <UploadIcon className="mr-2 text-amber-500" />
            Import Sovereign Assets
          </h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-slate-700 p-8 text-center transition-colors hover:border-amber-500"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <p className="font-medium text-slate-300">Click to select JSON file</p>
            <p className="mt-1 text-sm text-slate-500">Accepts array of CapsuleOS artifacts</p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {file && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">{file.name}</span>
                <span className="font-mono text-xs text-amber-500">
                  {parsedCapsules.length} valid capsules
                </span>
              </div>
              <label className="mt-4 flex cursor-pointer items-center space-x-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                <span>Overwrite existing capsules with identical IDs</span>
              </label>
              {overwrite && (
                <p className="mt-2 flex items-center text-xs text-red-400">
                  <AlertIcon className="mr-1 h-3 w-3" />
                  Warning: This violates strict negentropy if hashes mismatch.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 border-t border-slate-800 bg-slate-900/50 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || parsedCapsules.length === 0}
            className="rounded bg-amber-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {isImporting ? 'Ingesting...' : 'Execute Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
