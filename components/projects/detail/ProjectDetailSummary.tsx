'use client';

import Link from 'next/link';
import { ArrowLeft, Edit, Plus, Share2, Trash2 } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { formatCapsuleTier } from '@/lib/capsuleTier';
import type { ProjectCapsule } from '@/types/project';

interface ProjectDetailSummaryProps {
  project: ProjectCapsule;
  parentProject?: ProjectCapsule;
  deleting: boolean;
  onOpenAddModal: () => void;
  onDelete: () => void;
}

export default function ProjectDetailSummary({
  project,
  parentProject,
  deleting,
  onOpenAddModal,
  onDelete,
}: ProjectDetailSummaryProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="flex items-center gap-2 text-slate-400 hover:text-amber-500">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>
          <AppNav />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${encodeURIComponent(project.metadata.capsule_id)}/edit`}
            className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Edit className="h-4 w-4" /> Edit
          </Link>
          <Link
            href={`/projects/new?parent=${encodeURIComponent(project.metadata.capsule_id)}`}
            className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Add Sub-project
          </Link>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Share2 className="h-4 w-4" /> Link Existing Capsule
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-3xl font-bold text-slate-100">
          {project.metadata.name ?? project.metadata.capsule_id}
        </h1>
        <p className="mt-2 font-mono text-sm text-slate-500">{project.metadata.capsule_id}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-400 md:grid-cols-2">
          <p>
            <span className="text-slate-500">Status:</span> {project.metadata.status}
          </p>
          <p>
            <span className="text-slate-500">Type:</span> {project.metadata.type}/{project.metadata.subtype}
          </p>
          <p>
            <span className="text-slate-500">Tier:</span> {formatCapsuleTier(project.metadata.tier)}
          </p>
          <p>
            <span className="text-slate-500">Author:</span> {project.metadata.author ?? 'Unknown'}
          </p>
          <p>
            <span className="text-slate-500">Created:</span> {project.metadata.created_at ?? 'Unknown'}
          </p>
          {project.metadata.updated_at && (
            <p>
              <span className="text-slate-500">Updated:</span> {project.metadata.updated_at}
            </p>
          )}
          {parentProject && (
            <p>
              <span className="text-slate-500">Parent:</span>{' '}
              <Link
                href={`/projects/${encodeURIComponent(parentProject.metadata.capsule_id)}`}
                className="text-amber-500 hover:underline"
              >
                {parentProject.metadata.name ?? parentProject.metadata.capsule_id}
              </Link>
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h2 className="mb-2 text-lg font-semibold text-slate-200">Overview</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-300">{project.core_payload.content}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h2 className="mb-2 text-lg font-semibold text-slate-200">Neuro Concentrate</h2>
            <p className="text-sm text-slate-300">{project.neuro_concentrate.summary}</p>
          </div>
        </div>
      </section>
    </>
  );
}
