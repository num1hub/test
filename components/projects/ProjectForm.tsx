'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import {
  PROJECT_STATUSES,
  buildProjectPayload,
  ensureProjectId,
  extractExistingParentId,
  projectFormSchema,
  type ProjectFormValues,
} from '@/lib/projects/projectForm';
import { wouldCreateCycle } from '@/lib/projectUtils';
import { useCapsuleStore } from '@/store/capsuleStore';
import type { ProjectCapsule } from '@/types/project';
import { isProject } from '@/types/project';
import ProjectFormFields from './ProjectFormFields';

interface ProjectFormProps {
  initialData?: ProjectCapsule;
  initialParentId?: string;
  onSuccess?: (capsule: ProjectCapsule) => void;
}

type SaveProjectErrorResponse = {
  error?: string;
  errors?: Array<{ message?: string }>;
};

function createInitialFormState(
  initialData?: ProjectCapsule,
  initialParentId?: string,
): ProjectFormValues {
  return {
    name: initialData?.metadata.name ?? '',
    capsuleId: initialData?.metadata.capsule_id ?? '',
    status: initialData?.metadata.status ?? 'draft',
    author: initialData?.metadata.author ?? 'architect',
    summary: initialData?.neuro_concentrate.summary ?? '',
    keywords: initialData?.neuro_concentrate.keywords?.join(', ') ?? '',
    parentId: initialParentId ?? extractExistingParentId(initialData),
  };
}

function extractSaveErrorMessage(errorData: SaveProjectErrorResponse): string {
  return errorData.error || errorData.errors?.[0]?.message || 'Failed to save project.';
}

export default function ProjectForm({
  initialData,
  initialParentId,
  onSuccess,
}: ProjectFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const capsules = useCapsuleStore((state) => state.capsules);
  const fetchCapsules = useCapsuleStore((state) => state.fetchCapsules);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectFormValues>(() =>
    createInitialFormState(initialData, initialParentId),
  );

  const normalizedCapsuleId = useMemo(() => {
    if (form.capsuleId.trim()) return ensureProjectId(form.capsuleId);
    if (form.name.trim()) return ensureProjectId(form.name);
    return '';
  }, [form.capsuleId, form.name]);

  const projectOptions = useMemo(
    () =>
      capsules
        .filter(isProject)
        .filter((capsule) => capsule.metadata.capsule_id !== normalizedCapsuleId)
        .map((capsule) => ({
          id: capsule.metadata.capsule_id,
          label: capsule.metadata.name ?? capsule.metadata.capsule_id,
        })),
    [capsules, normalizedCapsuleId],
  );

  const cycleDetected = Boolean(
    form.parentId &&
      normalizedCapsuleId &&
      wouldCreateCycle(capsules, normalizedCapsuleId, form.parentId),
  );

  const setField = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedForm = projectFormSchema.safeParse(form);
    if (!parsedForm.success) {
      showToast(parsedForm.error.issues[0]?.message ?? 'Form validation failed.', 'error');
      return;
    }

    if (!normalizedCapsuleId) {
      showToast('Could not derive capsule ID.', 'error');
      return;
    }

    if (cycleDetected) {
      showToast('Selected parent would create a cycle.', 'error');
      return;
    }

    const token = localStorage.getItem('n1hub_vault_token');
    if (!token) {
      showToast('Authentication required.', 'error');
      router.push('/login');
      return;
    }

    const normalizedValues: ProjectFormValues = {
      ...parsedForm.data,
      capsuleId: parsedForm.data.capsuleId ?? '',
      parentId: parsedForm.data.parentId ?? '',
    };

    const payload = buildProjectPayload({
      initialData,
      values: normalizedValues,
      normalizedCapsuleId,
    });

    setSaving(true);
    try {
      const isEdit = Boolean(initialData);
      const targetId = initialData?.metadata.capsule_id ?? normalizedCapsuleId;
      const response = await fetch(
        isEdit ? `/api/capsules/${encodeURIComponent(targetId)}` : '/api/capsules',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json()) as SaveProjectErrorResponse;
        throw new Error(extractSaveErrorMessage(errorData));
      }

      const saved = (await response.json()) as ProjectCapsule;
      await fetchCapsules();
      showToast(isEdit ? 'Project updated.' : 'Project created.', 'success');

      if (onSuccess) {
        onSuccess(saved);
      } else {
        router.push(`/projects/${encodeURIComponent(saved.metadata.capsule_id)}`);
      }
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save project.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <ProjectFormFields
        form={form}
        saving={saving}
        cycleDetected={cycleDetected}
        normalizedCapsuleId={normalizedCapsuleId}
        projectOptions={projectOptions}
        statuses={PROJECT_STATUSES}
        isEdit={Boolean(initialData)}
        onFieldChange={setField}
      />
    </form>
  );
}
