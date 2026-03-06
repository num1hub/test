import type { SovereignCapsule } from '@/types/capsule';
import type { ProjectCapsule, ProjectTreeNode } from '@/types/project';
import { isProject } from '@/types/project';

function getPartOfTargets(capsule: SovereignCapsule): string[] {
  const links = Array.isArray(capsule.recursive_layer.links) ? capsule.recursive_layer.links : [];
  return links
    .filter((link) => link.relation_type === 'part_of' && typeof link.target_id === 'string')
    .map((link) => link.target_id);
}

/**
 * Extracts all project capsules from a flat capsule list.
 */
export function getAllProjects(capsules: SovereignCapsule[]): ProjectCapsule[] {
  return capsules.filter(isProject) as ProjectCapsule[];
}

/**
 * Builds a hierarchical tree from a flat list of capsules.
 * Uses `part_of` links (child -> parent) to establish parent-child edges.
 * Projects with no parent link or whose parent is not in the list become root nodes.
 */
export function buildProjectTree(capsules: SovereignCapsule[]): ProjectTreeNode[] {
  const projects = getAllProjects(capsules);
  const nodeMap = new Map<string, ProjectTreeNode>();
  const roots: ProjectTreeNode[] = [];

  for (const project of projects) {
    nodeMap.set(project.metadata.capsule_id, { ...project, children: [] });
  }

  const attached = new Set<string>();

  for (const project of projects) {
    const node = nodeMap.get(project.metadata.capsule_id);
    if (!node) continue;

    const parentId = getPartOfTargets(project).find((targetId) => nodeMap.has(targetId));
    if (parentId) {
      const parent = nodeMap.get(parentId);
      if (parent && parent.metadata.capsule_id !== node.metadata.capsule_id) {
        parent.children.push(node);
        attached.add(node.metadata.capsule_id);
        continue;
      }
    }

    roots.push(node);
  }

  // If malformed cyclic data made every node appear attached, expose all as roots to avoid blank tree.
  if (roots.length === 0 && nodeMap.size > 0) {
    for (const [id, node] of nodeMap.entries()) {
      if (attached.has(id)) {
        roots.push(node);
      }
    }
  }

  return roots;
}

/**
 * Returns all capsules (projects and atoms) that have a `part_of`
 * link pointing to the given project.
 */
export function getProjectChildren(
  projectId: string,
  capsules: SovereignCapsule[],
): SovereignCapsule[] {
  return capsules.filter((capsule) =>
    getPartOfTargets(capsule).some((targetId) => targetId === projectId),
  );
}

/**
 * Returns the parent project of a given project, if any.
 */
export function getProjectParent(
  projectId: string,
  capsules: SovereignCapsule[],
): ProjectCapsule | undefined {
  const capsule = capsules.find((item) => item.metadata.capsule_id === projectId);
  if (!capsule) return undefined;

  const projectsById = new Map(
    getAllProjects(capsules).map((project) => [project.metadata.capsule_id, project] as const),
  );

  for (const parentId of getPartOfTargets(capsule)) {
    const parent = projectsById.get(parentId);
    if (parent) return parent;
  }

  return undefined;
}

/**
 * Detects whether adding `childId` as a child of `parentId` would
 * create a cycle. Returns true if a cycle would result.
 */
export function wouldCreateCycle(
  capsules: SovereignCapsule[],
  childId: string,
  parentId: string,
): boolean {
  if (!childId || !parentId) return false;
  if (childId === parentId) return true;

  const projectsById = new Map(
    getAllProjects(capsules).map((project) => [project.metadata.capsule_id, project] as const),
  );

  // If one side is not a project, this helper treats it as non-cyclic for project hierarchy checks.
  if (!projectsById.has(childId) || !projectsById.has(parentId)) {
    return false;
  }

  const visited = new Set<string>();
  const stack: string[] = [parentId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (current === childId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const currentProject = projectsById.get(current);
    if (!currentProject) continue;

    for (const nextParentId of getPartOfTargets(currentProject)) {
      if (projectsById.has(nextParentId) && !visited.has(nextParentId)) {
        stack.push(nextParentId);
      }
    }
  }

  return false;
}

/**
 * Derives a human-readable display name from a capsule ID.
 * Example: `capsule.project.tilesims.v1` -> "Tilesims"
 */
export function deriveDisplayName(capsuleId: string): string {
  const parts = capsuleId.split('.');
  const projectIndex = parts.findIndex((part) => part === 'project');
  const slug =
    projectIndex >= 0 && parts[projectIndex + 1]
      ? parts[projectIndex + 1]
      : parts[2] || parts[1] || capsuleId;

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
