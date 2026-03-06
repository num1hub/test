'use client';

import type { ProjectFormValues } from '@/lib/projects/projectForm';

type ProjectOption = {
  id: string;
  label: string;
};

interface ProjectFormFieldsProps {
  form: ProjectFormValues;
  saving: boolean;
  cycleDetected: boolean;
  normalizedCapsuleId: string;
  projectOptions: ProjectOption[];
  statuses: readonly ProjectFormValues['status'][];
  isEdit: boolean;
  onFieldChange: <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) => void;
}

export default function ProjectFormFields({
  form,
  saving,
  cycleDetected,
  normalizedCapsuleId,
  projectOptions,
  statuses,
  isEdit,
  onFieldChange,
}: ProjectFormFieldsProps) {
  return (
    <>
      <h2 className="mb-2 text-xl font-bold text-slate-100">
        {isEdit ? 'Edit Project' : 'Create New Project'}
      </h2>

      <div>
        <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-slate-400">
          Project Name
        </label>
        <input
          id="project-name"
          value={form.name}
          onChange={(event) => onFieldChange('name', event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
          placeholder="TileSims"
        />
      </div>

      <div>
        <label htmlFor="project-id" className="mb-1 block text-sm font-medium text-slate-400">
          Capsule ID (optional)
        </label>
        <input
          id="project-id"
          value={form.capsuleId}
          onChange={(event) => onFieldChange('capsuleId', event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
          placeholder="capsule.project.tilesims.v1"
        />
        <p className="mt-1 text-xs text-slate-500">Resolved ID: {normalizedCapsuleId || 'n/a'}</p>
      </div>

      <div>
        <label htmlFor="project-status" className="mb-1 block text-sm font-medium text-slate-400">
          Status
        </label>
        <select
          id="project-status"
          value={form.status}
          onChange={(event) => onFieldChange('status', event.target.value as ProjectFormValues['status'])}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="project-author" className="mb-1 block text-sm font-medium text-slate-400">
          Author
        </label>
        <input
          id="project-author"
          value={form.author}
          onChange={(event) => onFieldChange('author', event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
          placeholder="architect"
        />
      </div>

      <div>
        <label htmlFor="project-summary" className="mb-1 block text-sm font-medium text-slate-400">
          Summary
        </label>
        <textarea
          id="project-summary"
          value={form.summary}
          onChange={(event) => onFieldChange('summary', event.target.value)}
          rows={5}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
          placeholder="70-160 words"
        />
      </div>

      <div>
        <label htmlFor="project-keywords" className="mb-1 block text-sm font-medium text-slate-400">
          Keywords (comma-separated)
        </label>
        <input
          id="project-keywords"
          value={form.keywords}
          onChange={(event) => onFieldChange('keywords', event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
          placeholder="project, capsuleos, roadmap, hierarchy, execution"
        />
      </div>

      <div>
        <label htmlFor="project-parent" className="mb-1 block text-sm font-medium text-slate-400">
          Parent Project (optional)
        </label>
        <select
          id="project-parent"
          value={form.parentId}
          onChange={(event) => onFieldChange('parentId', event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-4 py-2 text-slate-200"
        >
          <option value="">None (root project)</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.label}
            </option>
          ))}
        </select>
        {cycleDetected && (
          <p className="mt-1 text-xs text-red-500">
            This parent would create a cycle. Choose a different parent.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || cycleDetected}
        className="w-full rounded bg-amber-600 px-4 py-2 font-bold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
      </button>
    </>
  );
}
