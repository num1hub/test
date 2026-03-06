'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { ProjectCapsule } from '@/types/project';
import { isProject } from '@/types/project';

export function useProjectDetailState(projectId: string) {
  const router = useRouter();
  const { showToast } = useToast();
  const { capsules, fetchCapsules, deleteCapsuleLocally, isLoading } = useCapsuleStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    void fetchCapsules();
  }, [fetchCapsules, router]);

  const project = useMemo(
    () =>
      capsules.find(
        (capsule) => capsule.metadata.capsule_id === projectId && isProject(capsule),
      ) as ProjectCapsule | undefined,
    [capsules, projectId],
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

  const subprojects = useMemo(
    () => children.filter((capsule) => isProject(capsule)) as ProjectCapsule[],
    [children],
  );

  const atomicCapsules = useMemo(
    () => children.filter((capsule) => !isProject(capsule)),
    [children],
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

      deleteCapsuleLocally(project.metadata.capsule_id);
      showToast('Project deleted. Child capsules are now orphan roots.', 'info');
      router.push('/projects');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Deletion failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleGraphNodeClick = (capsuleId: string) => {
    if (capsules.some((capsule) => capsule.metadata.capsule_id === capsuleId && isProject(capsule))) {
      router.push(`/projects/${encodeURIComponent(capsuleId)}`);
      return;
    }

    router.push(`/vault/capsule/${encodeURIComponent(capsuleId)}`);
  };

  return {
    project,
    isLoading,
    capsules,
    children,
    subprojects,
    atomicCapsules,
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
    handleGraphNodeClick,
    refetchCapsules: fetchCapsules,
  };
}
