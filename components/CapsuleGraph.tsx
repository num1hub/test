import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from 'react-force-graph-2d';
import type { SovereignCapsule } from '@/types/capsule';
import {
  buildCapsuleGraphData,
  buildCapsuleGraphTooltip,
  DEFAULT_GRAPH_DIMENSIONS,
  isIncidentLink,
  type CapsuleGraphLinkData,
  type CapsuleGraphNodeData,
} from '@/lib/graph/capsuleGraph';

interface CapsuleGraphProps {
  capsules: SovereignCapsule[];
  onNodeClick: (id: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

type GraphNode = NodeObject<CapsuleGraphNodeData>;

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M8 11h6" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
    </svg>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M3 16v5h5" />
      <path d="M21 16v5h-5" />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M8 8H3V3" />
      <path d="M16 8h5V3" />
      <path d="M8 16H3v5" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function GraphControlButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-amber-400"
      title={title}
    >
      {children}
    </button>
  );
}

export default function CapsuleGraph({
  capsules,
  onNodeClick,
  isFullscreen,
  onToggleFullscreen,
}: CapsuleGraphProps) {
  const graphRef = useRef<ForceGraphMethods<CapsuleGraphNodeData, CapsuleGraphLinkData> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState(DEFAULT_GRAPH_DIMENSIONS);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const nextWidth = container.offsetWidth || DEFAULT_GRAPH_DIMENSIONS.width;
      const nextHeight = container.offsetHeight || DEFAULT_GRAPH_DIMENSIONS.height;

      setDimensions((current) => {
        if (current.width === nextWidth && current.height === nextHeight) {
          return current;
        }

        return {
          width: nextWidth,
          height: nextHeight,
        };
      });
    };

    updateDimensions();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => updateDimensions());
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  const graphData = useMemo(() => buildCapsuleGraphData(capsules), [capsules]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    const nextNodeId = node?.id ? String(node.id) : null;
    setHoveredNodeId(nextNodeId);

    if (containerRef.current) {
      containerRef.current.style.cursor = nextNodeId ? 'pointer' : 'default';
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.id === undefined) return;
      onNodeClick(String(node.id));
    },
    [onNodeClick],
  );

  const getNodeColor = useCallback(
    (node: CapsuleGraphNodeData) => {
      if (!hoveredNodeId) return node.color || '#94a3b8';
      return node.id === hoveredNodeId ? '#fbbf24' : 'rgba(148, 163, 184, 0.2)';
    },
    [hoveredNodeId],
  );

  const getLinkColor = useCallback(
    (link: CapsuleGraphLinkData) => {
      if (!hoveredNodeId) return link.color || '#475569';
      return isIncidentLink(link, hoveredNodeId) ? '#fbbf24' : '#475569';
    },
    [hoveredNodeId],
  );

  const getLinkWidth = useCallback(
    (link: CapsuleGraphLinkData) => (isIncidentLink(link, hoveredNodeId) ? 2 : 1),
    [hoveredNodeId],
  );

  const handleZoomIn = useCallback(() => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom * 1.2, 400);
  }, []);

  const handleZoomOut = useCallback(() => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom / 1.2, 400);
  }, []);

  const handleZoomFit = useCallback(() => {
    graphRef.current?.zoomToFit(400, 50);
  }, []);

  if (capsules.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        Topology empty.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-900">
      <div className="absolute right-4 top-4 z-10 flex flex-col space-y-2 rounded-lg border border-slate-700 bg-slate-800/80 p-2 shadow-lg backdrop-blur">
        <GraphControlButton onClick={handleZoomIn} title="Zoom In">
          <ZoomInIcon className="h-5 w-5" />
        </GraphControlButton>
        <GraphControlButton onClick={handleZoomOut} title="Zoom Out">
          <ZoomOutIcon className="h-5 w-5" />
        </GraphControlButton>
        <GraphControlButton onClick={handleZoomFit} title="Fit to Screen">
          <TargetIcon className="h-5 w-5" />
        </GraphControlButton>
        <div className="my-1 h-px bg-slate-700" />
        <GraphControlButton onClick={onToggleFullscreen} title="Toggle Fullscreen">
          {isFullscreen ? (
            <MinimizeIcon className="h-5 w-5" />
          ) : (
            <MaximizeIcon className="h-5 w-5" />
          )}
        </GraphControlButton>
      </div>

      <ForceGraph2D<CapsuleGraphNodeData, CapsuleGraphLinkData>
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeRelSize={1}
        nodeVal="val"
        nodeColor={getNodeColor}
        nodeLabel={buildCapsuleGraphTooltip}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link) => getLinkColor(link as CapsuleGraphLinkData)}
        backgroundColor="#020617"
      />
    </div>
  );
}
