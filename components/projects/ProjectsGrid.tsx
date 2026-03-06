'use client';

import Link from 'next/link';
import ProjectCard from '@/components/projects/ProjectCard';
import type { ProjectCapsule } from '@/types/project';

interface ProjectsGridProps {
  projects: ProjectCapsule[];
  childCountMap: Map<string, number>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

export default function ProjectsGrid({
  projects,
  childCountMap,
  selectedIds,
  onToggleSelect,
}: ProjectsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const id = project.metadata.capsule_id;
        return (
          <ProjectCard
            key={id}
            project={project}
            childCount={childCountMap.get(id) ?? 0}
            selected={selectedIds.has(id)}
            onToggleSelect={() => onToggleSelect(id)}
          />
        );
      })}

      {projects.length === 0 && (
        <div className="col-span-full rounded-xl border border-dashed border-slate-800 bg-slate-900/50 py-16 text-center text-slate-500">
          No projects found.{' '}
          <Link href="/projects/new" className="text-amber-500 hover:underline">
            Create your first project.
          </Link>
        </div>
      )}
    </div>
  );
}
