'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import ProjectForm from '@/components/projects/ProjectForm';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { ProjectCapsule } from '@/types/project';
import { isProject } from '@/types/project';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const projectId = decodeURIComponent(Array.isArray(rawId) ? rawId[0] : rawId ?? '');
  const { capsules, fetchCapsules, isLoading } = useCapsuleStore();

  useEffect(() => {
    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      router.push('/login');
      return;
    }

    void fetchCapsules();
  }, [fetchCapsules, router]);

  const project = useMemo(() => {
    return capsules.find(
      (capsule) => capsule.metadata.capsule_id === projectId && isProject(capsule),
    ) as ProjectCapsule | undefined;
  }, [capsules, projectId]);

  if (!project) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-400">
          <p className="animate-pulse">Loading project...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-400">
        <p>Project not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${encodeURIComponent(projectId)}`}
            className="text-sm text-slate-400 hover:text-amber-500"
          >
            ← Back to Project
          </Link>
          <AppNav />
        </div>

        <ProjectForm
          initialData={project}
          onSuccess={(savedProject) => {
            router.push(`/projects/${encodeURIComponent(savedProject.metadata.capsule_id)}`);
          }}
        />
      </div>
    </div>
  );
}
