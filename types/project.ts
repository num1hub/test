import type { SovereignCapsule } from '@/types/capsule';

/** A project capsule is a hub that aggregates work. */
export interface ProjectCapsule extends SovereignCapsule {
  metadata: SovereignCapsule['metadata'] & {
    type: 'project';
    subtype: 'hub';
  };
}

/** Type guard: returns true when a capsule is a project. */
export function isProject(capsule: SovereignCapsule): capsule is ProjectCapsule {
  return capsule.metadata.type === 'project' && capsule.metadata.subtype === 'hub';
}

/** A tree node wraps a ProjectCapsule with resolved children. */
export interface ProjectTreeNode extends ProjectCapsule {
  children: ProjectTreeNode[];
}
