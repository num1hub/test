'use client';

import { useParams } from 'next/navigation';
import AddCapsuleModal from '@/components/projects/AddCapsuleModal';
import {
  ProjectDetailLoadingState,
  ProjectDetailNotFoundState,
} from '@/components/projects/detail/ProjectDetailState';
import ProjectDetailSummary from '@/components/projects/detail/ProjectDetailSummary';
import ProjectLinkedCapsulesSection from '@/components/projects/detail/ProjectLinkedCapsulesSection';
import ProjectNeighborhoodGraph from '@/components/projects/detail/ProjectNeighborhoodGraph';
import { useProjectDetailState } from '@/hooks/useProjectDetailState';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const projectId = decodeURIComponent(Array.isArray(rawId) ? rawId[0] : rawId ?? '');

  const {
    project,
    isLoading,
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
    refetchCapsules,
  } = useProjectDetailState(projectId);

  if (!project) {
    return isLoading ? <ProjectDetailLoadingState /> : <ProjectDetailNotFoundState />;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 pb-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProjectDetailSummary
          project={project}
          parentProject={parentProject}
          deleting={deleting}
          onOpenAddModal={() => setShowAddModal(true)}
          onDelete={() => void handleDelete()}
        />

        <ProjectLinkedCapsulesSection
          title="Sub-projects"
          items={subprojects}
          emptyText="No sub-projects."
          icon="layers"
          getHref={(capsule) => `/projects/${encodeURIComponent(capsule.metadata.capsule_id)}`}
          getSubtitle={(capsule) => capsule.neuro_concentrate.summary ?? 'No summary available.'}
        />

        <ProjectLinkedCapsulesSection
          title="Atomic Capsules"
          items={atomicCapsules}
          emptyText="No atomic capsules linked to this project."
          getHref={(capsule) => `/vault/capsule/${encodeURIComponent(capsule.metadata.capsule_id)}`}
          getSubtitle={(capsule) => `${capsule.metadata.type} · ${capsule.metadata.status}`}
        />

        <ProjectNeighborhoodGraph
          capsules={neighborhoodCapsules}
          showGraph={showGraph}
          graphFullscreen={graphFullscreen}
          onToggleGraph={() => setShowGraph((prev) => !prev)}
          onToggleFullscreen={() => setGraphFullscreen((prev) => !prev)}
          onNodeClick={handleGraphNodeClick}
        />
      </div>

      {showAddModal && (
        <AddCapsuleModal
          projectId={project.metadata.capsule_id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            void refetchCapsules();
          }}
        />
      )}
    </div>
  );
}
