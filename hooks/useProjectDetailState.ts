'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { fetchBranchCapsules, getVaultToken } from '@/lib/vault/capsuleBranchApi';
import type { SovereignCapsule } from '@/types/capsule';
import type { ProjectCapsule } from '@/types/project';
import { isProject } from '@/types/project';
import type { BranchName } from '@/types/branch';

export function useProjectDetailState(projectId: string, branch: BranchName = 'real') {
  const router = useRouter();
  const { showToast } = useToast();

  const [capsules, setCapsules] = useState<SovereignCapsule[]>([]);
  const [baselineCapsules, setBaselineCapsules] = useState<SovereignCapsule[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refetchCapsules = useCallback(async () => {
    const token = getVaultToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const [{ response, data }, baseline] = await Promise.all([
        fetchBranchCapsules(branch, token),
        branch === 'real' ? Promise.resolve(null) : fetchBranchCapsules('real', token),
      ]);

      if (!response.ok || !data) {
        throw new Error('Failed to load project capsules.');
      }
      setCapsules(Array.isArray(data) ? data : []);
      setBaselineCapsules(
        baseline && baseline.response.ok && Array.isArray(baseline.data) ? baseline.data : null,
      );
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to load project capsules.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [branch, router, showToast]);

  useEffect(() => {
    void refetchCapsules();
  }, [refetchCapsules]);

  const project = useMemo(
    () =>
      capsules.find(
        (capsule) => capsule.metadata.capsule_id === projectId && isProject(capsule),
      ) as ProjectCapsule | undefined,
    [capsules, projectId],
  );

  const baselineProject = useMemo(
    () =>
      baselineCapsules?.find(
        (capsule) => capsule.metadata.capsule_id === projectId && isProject(capsule),
      ) as ProjectCapsule | undefined,
    [baselineCapsules, projectId],
  );

  const children = useMemo(
    () =>
      capsules.filter((capsule) =>
        (capsule.recursive_layer.links ?? []).some(
          (link) => link.relation_type === 'part_of' && link.target_id === projectId,
        ),
      ),
    [capsules, projectId],
  );

  const baselineChildren = useMemo(
    () =>
      (baselineCapsules ?? []).filter((capsule) =>
        (capsule.recursive_layer.links ?? []).some(
          (link) => link.relation_type === 'part_of' && link.target_id === projectId,
        ),
      ),
    [baselineCapsules, projectId],
  );

  const subprojects = useMemo(
    () => children.filter((capsule) => isProject(capsule)) as ProjectCapsule[],
    [children],
  );

  const baselineSubprojects = useMemo(
    () => baselineChildren.filter((capsule) => isProject(capsule)) as ProjectCapsule[],
    [baselineChildren],
  );

  const atomicCapsules = useMemo(
    () => children.filter((capsule) => !isProject(capsule)),
    [children],
  );

  const baselineAtomicCapsules = useMemo(
    () => baselineChildren.filter((capsule) => !isProject(capsule)),
    [baselineChildren],
  );

  const parentProject = useMemo(() => {
    if (!project) return undefined;
    const parentLink = (project.recursive_layer.links ?? []).find(
      (link) => link.relation_type === 'part_of',
    );
    if (!parentLink) return undefined;

    return capsules.find(
      (capsule) => capsule.metadata.capsule_id === parentLink.target_id && isProject(capsule),
    ) as ProjectCapsule | undefined;
  }, [capsules, project]);

  const neighborhoodCapsules = useMemo(() => {
    if (!project) return [];

    const ids = new Set<string>([project.metadata.capsule_id]);
    if (parentProject) ids.add(parentProject.metadata.capsule_id);

    children.forEach((child) => ids.add(child.metadata.capsule_id));
    (project.recursive_layer.links ?? []).forEach((link) => ids.add(link.target_id));

    capsules.forEach((capsule) => {
      if (
        (capsule.recursive_layer.links ?? []).some(
          (link) => link.target_id === project.metadata.capsule_id,
        )
      ) {
        ids.add(capsule.metadata.capsule_id);
      }
    });

    return capsules.filter((capsule) => ids.has(capsule.metadata.capsule_id));
  }, [capsules, children, parentProject, project]);

  const handleDelete = async () => {
    if (!project) return;

    const warning = `Delete project "${project.metadata.name ?? project.metadata.capsule_id}"? ${children.length} child capsule(s) will become orphan roots.`;
    if (!window.confirm(warning)) return;

    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/capsules/${encodeURIComponent(project.metadata.capsule_id)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Deletion failed');
      }

      showToast('Project deleted. Child capsules are now orphan roots.', 'info');
      router.push('/projects');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Deletion failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getGraphNodeHref = useCallback((capsuleId: string) => {
    const branchSuffix = branch === 'real' ? '' : `?branch=${encodeURIComponent(branch)}`;
    if (capsules.some((capsule) => capsule.metadata.capsule_id === capsuleId && isProject(capsule))) {
      return `/projects/${encodeURIComponent(capsuleId)}${branchSuffix}`;
    }

    return `/vault/capsule/${encodeURIComponent(capsuleId)}${branchSuffix}`;
  }, [branch, capsules]);

  return {
    project,
    baselineProject,
    isLoading,
    capsules,
    children,
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
  };
}
