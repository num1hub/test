'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import AddCapsuleModal from '@/components/projects/AddCapsuleModal';
import DiffViewer from '@/components/DiffViewer';
import ProjectBranchMergePanel from '@/components/projects/detail/ProjectBranchMergePanel';
import {
  ProjectDetailLoadingState,
  ProjectDetailNotFoundState,
} from '@/components/projects/detail/ProjectDetailState';
import ProjectDetailSummary from '@/components/projects/detail/ProjectDetailSummary';
import ProjectLinkedCapsulesSection from '@/components/projects/detail/ProjectLinkedCapsulesSection';
import ProjectNeighborhoodGraph from '@/components/projects/detail/ProjectNeighborhoodGraph';
import ProjectTierSummary from '@/components/projects/detail/ProjectTierSummary';
import { useToast } from '@/contexts/ToastContext';
import { useProjectDetailState } from '@/hooks/useProjectDetailState';
import type { BranchName } from '@/types/branch';
import { normalizeBranchName } from '@/types/branch';
import type { DiffResult, MergeResult } from '@/contracts/diff';
import {
  applyBranchMerge,
  fetchBranchList,
  getVaultToken,
  parseErrorMessage,
} from '@/lib/vault/capsuleBranchApi';

function ProjectDetailPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const projectId = decodeURIComponent(Array.isArray(rawId) ? rawId[0] : rawId ?? '');
  const initialBranch = useMemo(
    () => normalizeBranchName(searchParams.get('branch') ?? 'real') ?? 'real',
    [searchParams],
  );
  const [branch, setBranch] = useState<BranchName>(initialBranch);
  const [availableBranches, setAvailableBranches] = useState<BranchName[]>(['real']);
  const [projectDiff, setProjectDiff] = useState<DiffResult | null>(null);
  const [mergePreview, setMergePreview] = useState<MergeResult | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isPreviewingMerge, setIsPreviewingMerge] = useState(false);
  const [isApplyingMerge, setIsApplyingMerge] = useState(false);

  const {
    project,
    baselineProject,
    isLoading,
    subprojects,
    baselineSubprojects,
    atomicCapsules,
    baselineAtomicCapsules,
    parentProject,
    neighborhoodCapsules,
    showAddModal,
    setShowAddModal,
    showGraph,
    setShowGraph,
    graphFullscreen,
    setGraphFullscreen,
    deleting,
    handleDelete,
    getGraphNodeHref,
    refetchCapsules,
  } = useProjectDetailState(projectId, branch);

  useEffect(() => {
    setBranch(initialBranch);
  }, [initialBranch]);

  useEffect(() => {
    setProjectDiff(null);
    setMergePreview(null);
    setIsDiffOpen(false);
  }, [branch, projectId]);

  useEffect(() => {
    const token = getVaultToken();

    void fetchBranchList({ token, projectId }).then(({ response, data }) => {
      if (!response.ok || !data) return;
      const branches = data.branches.map((item) => item.name).sort((left, right) => left.localeCompare(right));
      setAvailableBranches(branches);
      if (!branches.includes(branch)) {
        setBranch('real');
      }
    });
  }, [branch, projectId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (branch === 'real') params.delete('branch');
    else params.set('branch', branch);

    const next = params.toString();
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    const current = searchParams.toString();
    const currentUrl = current ? `${pathname}?${current}` : pathname;

    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [branch, pathname, router, searchParams]);

  const handleProjectDiff = async () => {
    const token = getVaultToken();
    try {
      const response = await fetch('/api/diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branchA: 'real',
          branchB: branch,
          scopeType: 'project',
          scopeRootId: projectId,
          recursive: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Failed to compute project diff.'));
      }

      const diff = (await response.json()) as DiffResult;
      setProjectDiff(diff);
      setIsDiffOpen(true);
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : 'Failed to compute project diff.',
        'error',
      );
    }
  };

  const handlePreviewMerge = async () => {
    if (branch === 'real') {
      showToast('Select a non-real branch before previewing a merge.', 'info');
      return;
    }

    const token = getVaultToken();
    setIsPreviewingMerge(true);
    try {
      const { response, data } = await applyBranchMerge(
        {
          sourceBranch: branch,
          targetBranch: 'real',
          scopeType: 'project',
          scopeRootId: projectId,
          recursive: true,
          conflictResolution: 'manual',
          dryRun: true,
        },
        token,
      );

      if (!response.ok || !data) {
        throw new Error(await parseErrorMessage(response, 'Failed to preview merge.'));
      }

      setMergePreview(data);
      setProjectDiff(data.diff);
      setIsDiffOpen(true);
      showToast(
        data.conflicts.length > 0
          ? `Preview found ${data.conflicts.length} conflict(s).`
          : 'Merge preview is ready.',
        data.conflicts.length > 0 ? 'info' : 'success',
      );
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to preview merge.', 'error');
    } finally {
      setIsPreviewingMerge(false);
    }
  };

  const handleApplyMerge = async () => {
    if (branch === 'real') {
      showToast('Real is already the baseline branch.', 'info');
      return;
    }

    if (!mergePreview) {
      showToast('Run a merge preview before applying the branch.', 'info');
      return;
    }

    if (mergePreview.conflicts.length > 0) {
      setProjectDiff(mergePreview.diff);
      setIsDiffOpen(true);
      showToast('Preview conflicts must be reviewed before merge apply.', 'error');
      return;
    }

    if (!window.confirm(`Apply branch "${branch}" into real for this project scope?`)) {
      return;
    }

    const token = getVaultToken();
    setIsApplyingMerge(true);
    try {
      const { response, data } = await applyBranchMerge(
        {
          sourceBranch: branch,
          targetBranch: 'real',
          scopeType: 'project',
          scopeRootId: projectId,
          recursive: true,
          conflictResolution: 'manual',
          dryRun: false,
        },
        token,
      );

      if (response.status === 409 && data) {
        setMergePreview(data);
        setProjectDiff(data.diff);
        setIsDiffOpen(true);
        showToast('Merge blocked by conflicts. Review the preview diff.', 'error');
        return;
      }

      if (!response.ok || !data) {
        throw new Error(await parseErrorMessage(response, 'Failed to apply merge.'));
      }

      setMergePreview(null);
      setProjectDiff(null);
      setIsDiffOpen(false);
      await refetchCapsules();
      showToast('Project branch merged into real baseline.', 'success');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to apply merge.', 'error');
    } finally {
      setIsApplyingMerge(false);
    }
  };

  if (!project) {
    return isLoading ? <ProjectDetailLoadingState /> : <ProjectDetailNotFoundState />;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Project Branch</div>
            <div className="mt-1 text-sm text-slate-300">
              Review project hierarchy in any overlay branch without leaving the existing dashboard.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
            >
              {availableBranches.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleProjectDiff()}
              disabled={branch === 'real'}
              className="rounded-lg border border-sky-900/50 bg-sky-900/20 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-900/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Project Diff
            </button>
          </div>
        </div>

        <ProjectDetailSummary
          project={project}
          parentProject={parentProject}
          deleting={deleting}
          onOpenAddModal={() => setShowAddModal(true)}
          onDelete={() => void handleDelete()}
        />

        <ProjectTierSummary
          branch={branch}
          project={project}
          linkedCapsules={[...subprojects, ...atomicCapsules]}
          baselineProject={baselineProject}
          baselineLinkedCapsules={
            branch === 'real' ? null : [...baselineSubprojects, ...baselineAtomicCapsules]
          }
        />

        <ProjectBranchMergePanel
          branch={branch}
          preview={mergePreview}
          isPreviewing={isPreviewingMerge}
          isApplying={isApplyingMerge}
          onPreview={() => void handlePreviewMerge()}
          onApply={() => void handleApplyMerge()}
          onOpenPreview={() => {
            if (!mergePreview) return;
            setProjectDiff(mergePreview.diff);
            setIsDiffOpen(true);
          }}
        />

        <ProjectLinkedCapsulesSection
          title="Sub-projects"
          items={subprojects}
          emptyText="No sub-projects."
          icon="layers"
          getHref={(capsule) => `/projects/${encodeURIComponent(capsule.metadata.capsule_id)}${branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`}`}
          getSubtitle={(capsule) => capsule.neuro_concentrate.summary ?? 'No summary available.'}
        />

        <ProjectLinkedCapsulesSection
          title="Atomic Capsules"
          items={atomicCapsules}
          emptyText="No atomic capsules linked to this project."
          getHref={(capsule) => `/vault/capsule/${encodeURIComponent(capsule.metadata.capsule_id)}${branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`}`}
          getSubtitle={(capsule) => `${capsule.metadata.type} · ${capsule.metadata.status}`}
        />

        <ProjectNeighborhoodGraph
          capsules={neighborhoodCapsules}
          showGraph={showGraph}
          graphFullscreen={graphFullscreen}
          onToggleGraph={() => setShowGraph((prev) => !prev)}
          onToggleFullscreen={() => setGraphFullscreen((prev) => !prev)}
          getNodeHref={getGraphNodeHref}
        />
      </div>

      {showAddModal && (
        <AddCapsuleModal
          projectId={project.metadata.capsule_id}
          branch={branch}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            void refetchCapsules();
          }}
        />
      )}

      {isDiffOpen && projectDiff && (
        <DiffViewer diff={projectDiff} isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<ProjectDetailLoadingState />}>
      <ProjectDetailPageContent />
    </Suspense>
  );
}
