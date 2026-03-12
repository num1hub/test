'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { getClientAuthHeaders, getClientJsonAuthHeaders } from '@/lib/clientAuth';
import type { BranchName } from '@/types/branch';
import type { SovereignCapsule } from '@/types/capsule';
import { isProject } from '@/types/project';
import { wouldCreateCycle } from '@/lib/projectUtils';

interface AddCapsuleModalProps {
  projectId: string;
  branch?: BranchName;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Modal that lets the user search for an existing capsule and attach it
 * to the current project by adding a `part_of` link.
 */
export default function AddCapsuleModal({
  projectId,
  branch = 'real',
  onClose,
  onAdded,
}: AddCapsuleModalProps) {
  const { showToast } = useToast();
  const [capsules, setCapsules] = useState<SovereignCapsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/capsules?branch=${encodeURIComponent(branch)}`, {
      headers: getClientAuthHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load capsules for linking.');
        }
        return (await response.json()) as SovereignCapsule[];
      })
      .then((data) => {
        setCapsules(Array.isArray(data) ? data : []);
      })
      .catch((error: unknown) => {
        showToast(
          error instanceof Error ? error.message : 'Failed to load capsules for linking.',
          'error',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [branch, showToast]);

  const candidates = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();

    return capsules.filter((capsule) => {
      if (capsule.metadata.capsule_id === projectId) return false;

      const alreadyLinked = (capsule.recursive_layer.links ?? []).some(
        (link) => link.relation_type === 'part_of' && link.target_id === projectId,
      );
      if (alreadyLinked) return false;

      if (isProject(capsule) && wouldCreateCycle(capsules, capsule.metadata.capsule_id, projectId)) {
        return false;
      }

      if (!lowerQuery) return true;

      const id = capsule.metadata.capsule_id.toLowerCase();
      const name = (capsule.metadata.name ?? '').toLowerCase();
      const summary = (capsule.neuro_concentrate.summary ?? '').toLowerCase();
      return id.includes(lowerQuery) || name.includes(lowerQuery) || summary.includes(lowerQuery);
    });
  }, [capsules, projectId, query]);

  const handleAdd = async (capsule: SovereignCapsule) => {
    const updatedCapsule: SovereignCapsule = {
      ...capsule,
      recursive_layer: {
        ...capsule.recursive_layer,
        links: [
          ...(capsule.recursive_layer.links ?? []),
          { target_id: projectId, relation_type: 'part_of' },
        ],
      },
    };

    setSubmittingId(capsule.metadata.capsule_id);
    try {
      const response = await fetch(
        `/api/capsules/${encodeURIComponent(capsule.metadata.capsule_id)}${branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`}`,
        {
          method: 'PUT',
          headers: getClientJsonAuthHeaders(),
          body: JSON.stringify(updatedCapsule),
        },
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Failed to link capsule.');
      }

      showToast('Capsule linked to project.', 'success');
      onAdded();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to link capsule.';
      showToast(message, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">Link Existing Capsule</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search capsules..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
        />

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading && (
            <div className="rounded border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              Loading branch capsules...
            </div>
          )}

          {candidates.slice(0, 50).map((capsule) => (
            <div
              key={capsule.metadata.capsule_id}
              className="flex items-center justify-between rounded bg-slate-800 p-3 transition-colors hover:bg-slate-700"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {capsule.metadata.name ?? capsule.metadata.capsule_id}
                </p>
                <p className="text-xs text-slate-500">
                  {capsule.metadata.type} · {capsule.metadata.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleAdd(capsule)}
                disabled={submittingId === capsule.metadata.capsule_id}
                className="rounded bg-amber-600 px-3 py-1 text-xs text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
              >
                {submittingId === capsule.metadata.capsule_id ? 'Adding...' : 'Add'}
              </button>
            </div>
          ))}

          {candidates.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">No matching capsules.</p>
          )}
        </div>
      </div>
    </div>
  );
}
