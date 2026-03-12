import { create } from 'zustand';
import { SovereignCapsule } from '@/types/capsule';
import { getAllProjects, buildProjectTree, getProjectChildren, getProjectParent } from '@/lib/projectUtils';
import type { ProjectCapsule, ProjectTreeNode } from '@/types/project';
import { isProject } from '@/types/project';

interface CapsuleStore {
  capsules: SovereignCapsule[];
  validationStatus: Record<
    string,
    { valid: boolean; warnings: number; errors: number; updated_at: string }
  >;
  isLoading: boolean;
  error: string | null;
  fetchCapsules: (branch?: string) => Promise<void>;
  addCapsuleLocally: (capsule: SovereignCapsule) => void;
  deleteCapsuleLocally: (id: string) => void;
  removeCapsulesLocally: (ids: string[]) => void;
  updateCapsuleLocally: (id: string, updatedCapsule: SovereignCapsule) => void;
  setValidationStatus: (id: string, status: { valid: boolean; warnings: number; errors: number }) => void;
  clearValidationStatus: (id: string) => void;
  fetchProjects: () => ProjectCapsule[];
  fetchProjectTree: () => ProjectTreeNode[];
  getProjectById: (id: string) => ProjectCapsule | undefined;
  getProjectChildren: (projectId: string) => SovereignCapsule[];
  getProjectParent: (projectId: string) => ProjectCapsule | undefined;
}

export const useCapsuleStore = create<CapsuleStore>((set, get) => ({
  capsules: [],
  validationStatus: {},
  isLoading: true,
  error: null,
  fetchCapsules: async (branch = 'real') => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('n1hub_vault_token');

      const params = new URLSearchParams();
      if (branch && branch !== 'real') {
        params.set('branch', branch);
      }

      const res = await fetch(`/api/capsules${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error('Failed to fetch from server');
      const data = await res.json();
      set({ capsules: data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, isLoading: false });
    }
  },
  addCapsuleLocally: (capsule) => {
    set((state) => ({ capsules: [...state.capsules, capsule] }));
  },
  deleteCapsuleLocally: (id) => {
    set((state) => ({
      capsules: state.capsules.filter((c) => c.metadata.capsule_id !== id),
    }));
  },
  removeCapsulesLocally: (ids) => {
    set((state) => {
      const idSet = new Set(ids);
      return {
        capsules: state.capsules.filter((capsule) => !idSet.has(capsule.metadata.capsule_id)),
      };
    });
  },
  updateCapsuleLocally: (id, updatedCapsule) => {
    set((state) => ({
      capsules: state.capsules.map((capsule) =>
        capsule.metadata.capsule_id === id ? updatedCapsule : capsule,
      ),
    }));
  },
  setValidationStatus: (id, status) => {
    set((state) => ({
      validationStatus: {
        ...state.validationStatus,
        [id]: {
          ...status,
          updated_at: new Date().toISOString(),
        },
      },
    }));
  },
  clearValidationStatus: (id) => {
    set((state) => {
      const next = { ...state.validationStatus };
      delete next[id];
      return { validationStatus: next };
    });
  },
  fetchProjects: () => {
    return getAllProjects(get().capsules);
  },
  fetchProjectTree: () => {
    return buildProjectTree(get().capsules);
  },
  getProjectById: (id) => {
    return get().capsules.find((capsule) => capsule.metadata.capsule_id === id && isProject(capsule)) as
      | ProjectCapsule
      | undefined;
  },
  getProjectChildren: (projectId) => {
    return getProjectChildren(projectId, get().capsules);
  },
  getProjectParent: (projectId) => {
    return getProjectParent(projectId, get().capsules);
  },
}));
