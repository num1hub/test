import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from 'react-force-graph-2d';
import type { SovereignCapsule } from '@/types/capsule';
import {
  buildCapsuleGraphData,
  buildCapsuleGraphTooltip,
  DEFAULT_GRAPH_DIMENSIONS,
  extractGraphEndpointId,
  isIncidentLink,
  type CapsuleGraphLinkData,
  type CapsuleGraphNodeData,
} from '@/lib/graph/capsuleGraph';

interface CapsuleGraphProps {
  capsules: SovereignCapsule[];
  getNodeHref?: (id: string) => string | null | undefined;
  activeBranch?: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  searchQuery?: string;
  searchMatchNodeIds?: string[];
  searchFocusNodeId?: string | null;
  searchFocusToken?: number;
  searchSelectNodeId?: string | null;
  searchSelectToken?: number;
  fitRequestToken?: number;
  clearSelectionToken?: number;
  searchOverlay?: ReactNode;
}

type GraphDimensions = {
  width: number;
  height: number;
};

type GraphNode = NodeObject<CapsuleGraphNodeData>;
type GraphNodeRecord = CapsuleGraphNodeData & {
  x?: number;
  y?: number;
};

type GraphControlIcon = (props: { className?: string }) => ReactNode;

type GraphControl = {
  id: string;
  title: string;
  icon: GraphControlIcon;
  onClick: () => void;
  dividerAfter?: boolean;
  disabled?: boolean;
};

const GRAPH_BACKGROUND = '#020617';
const HIGHLIGHT_COLOR = '#fbbf24';
const BASE_LINK_COLOR = '#475569';
const DIMMED_LINK_COLOR = 'rgba(71, 85, 105, 0.22)';
const DIMMED_NODE_COLOR = 'rgba(148, 163, 184, 0.2)';
const ZOOM_STEP = 1.2;
const ZOOM_TRANSITION_MS = 400;
const ZOOM_FIT_PADDING = 50;
const NODE_REL_SIZE = 1;
const SELECT_FOCUS_ZOOM = 1.75;
const MAX_LINK_WEIGHT_BOOST = 2.5;

const MIN_CONTAINER_SIZE = 1;

function getContainerDimensions(container: HTMLDivElement | null): GraphDimensions {
  const width = container?.offsetWidth || DEFAULT_GRAPH_DIMENSIONS.width;
  const height = container?.offsetHeight || DEFAULT_GRAPH_DIMENSIONS.height;

  return {
    width: Math.max(MIN_CONTAINER_SIZE, width),
    height: Math.max(MIN_CONTAINER_SIZE, height),
  };
}

function useResponsiveGraphDimensions(
  containerRef: RefObject<HTMLDivElement | null>,
  isFullscreen: boolean,
): GraphDimensions {
  const [dimensions, setDimensions] = useState<GraphDimensions>(DEFAULT_GRAPH_DIMENSIONS);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const next = getContainerDimensions(container);
      setDimensions((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };

    updateDimensions();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef, isFullscreen]);

  return dimensions;
}

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

function FitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 3H3v6" />
      <path d="M15 3h6v6" />
      <path d="M3 15v6h6" />
      <path d="M21 15v6h-6" />
      <path d="M8 8h8v8H8z" />
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

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function GraphControlButton({
  onClick,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      className="rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-300"
      title={title}
    >
      {children}
    </button>
  );
}

function GraphControls({
  controls,
}: {
  controls: readonly GraphControl[];
}) {
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col space-y-2 rounded-lg border border-slate-700 bg-slate-800/80 p-2 shadow-lg backdrop-blur">
      {controls.map((control) => (
        <div key={control.id}>
          <GraphControlButton
            onClick={control.onClick}
            title={control.title}
            disabled={control.disabled}
          >
            <control.icon className="h-5 w-5" />
          </GraphControlButton>
          {control.dividerAfter && <div className="my-1 h-px bg-slate-700" />}
        </div>
      ))}
    </div>
  );
}

export default function CapsuleGraph({
  capsules,
  getNodeHref,
  activeBranch = null,
  isFullscreen,
  onToggleFullscreen,
  searchQuery = '',
  searchMatchNodeIds,
  searchFocusNodeId = null,
  searchFocusToken = 0,
  searchSelectNodeId = null,
  searchSelectToken = 0,
  fitRequestToken = 0,
  clearSelectionToken = 0,
  searchOverlay,
}: CapsuleGraphProps) {
  const graphRef = useRef<ForceGraphMethods<CapsuleGraphNodeData, CapsuleGraphLinkData> | undefined>(
    undefined,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const focusFrameRef = useRef<number | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const dimensions = useResponsiveGraphDimensions(containerRef, isFullscreen);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const graphData = useMemo(
    () => buildCapsuleGraphData(capsules, { activeBranch }),
    [activeBranch, capsules],
  );
  const nodeById = useMemo(
    () =>
      new Map(
        graphData.nodes.map((node) => [node.id, node as GraphNodeRecord]),
      ),
    [graphData.nodes],
  );
  const nodeIdsByCapsuleId = useMemo(() => {
    const nextMap = new Map<string, string[]>();

    graphData.nodes.forEach((node) => {
      const existingIds = nextMap.get(node.capsuleId);
      if (existingIds) {
        existingIds.push(node.id);
        return;
      }

      nextMap.set(node.capsuleId, [node.id]);
    });

    return nextMap;
  }, [graphData.nodes]);
  const resolveNodeId = useCallback(
    (candidateId: string | null | undefined) => {
      if (!candidateId) {
        return null;
      }

      if (nodeById.has(candidateId)) {
        return candidateId;
      }

      const capsuleMatches = nodeIdsByCapsuleId.get(candidateId);
      if (!capsuleMatches || capsuleMatches.length !== 1) {
        return null;
      }

      return capsuleMatches[0];
    },
    [nodeById, nodeIdsByCapsuleId],
  );
  const selectedNodeHref = useMemo(() => {
    if (!selectedNodeId || !getNodeHref) return null;
    const selectedNode = nodeById.get(selectedNodeId);
    if (!selectedNode) {
      return null;
    }
    return getNodeHref(selectedNode.capsuleId) ?? null;
  }, [getNodeHref, nodeById, selectedNodeId]);
  const matchedNodeIds = useMemo(() => {
    if (searchMatchNodeIds) {
      return new Set(
        searchMatchNodeIds
          .map((nodeId) => resolveNodeId(nodeId))
          .filter((nodeId): nodeId is string => Boolean(nodeId)),
      );
    }

    const matches = new Set<string>();

    if (!normalizedSearchQuery) {
      return matches;
    }

    for (const node of graphData.nodes) {
      const searchableFields = [
        node.capsuleId,
        node.id,
        node.name,
        node.fullName,
        node.summary,
        node.type,
      ];
      if (
        searchableFields.some(
          (field) => typeof field === 'string' && field.toLowerCase().includes(normalizedSearchQuery),
        )
      ) {
        matches.add(node.id);
      }
    }

    return matches;
  }, [graphData.nodes, normalizedSearchQuery, resolveNodeId, searchMatchNodeIds]);
  const resolvedSearchFocusNodeId = useMemo(
    () => resolveNodeId(searchFocusNodeId),
    [resolveNodeId, searchFocusNodeId],
  );
  const matchedNodeCount = matchedNodeIds.size;
  const focusedSearchNodeId = useMemo(() => {
    if (!normalizedSearchQuery || !resolvedSearchFocusNodeId) {
      return null;
    }

    return matchedNodeIds.has(resolvedSearchFocusNodeId) ? resolvedSearchFocusNodeId : null;
  }, [matchedNodeIds, normalizedSearchQuery, resolvedSearchFocusNodeId]);
  const activeNodeId = useMemo(() => {
    if (hoveredNodeId) {
      return hoveredNodeId;
    }

    return selectedNodeId;
  }, [hoveredNodeId, selectedNodeId]);
  const visualFocusNodeId = activeNodeId ?? focusedSearchNodeId;
  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null),
    [nodeById, selectedNodeId],
  );

  const activeNeighbors = useMemo(() => {
    const neighbors = new Set<string>();

    if (!visualFocusNodeId) return neighbors;

    graphData.links.forEach((link) => {
      if (!isIncidentLink(link, visualFocusNodeId)) return;

      const sourceId = extractGraphEndpointId(link.source);
      const targetId = extractGraphEndpointId(link.target);

      if (sourceId) neighbors.add(sourceId);
      if (targetId) neighbors.add(targetId);
    });

    return neighbors;
  }, [graphData.links, visualFocusNodeId]);
  const selectedLinkCount = useMemo(() => {
    if (!selectedNodeId) return 0;

    return graphData.links.reduce(
      (total, link) => (isIncidentLink(link, selectedNodeId) ? total + (link.weight ?? 1) : total),
      0,
    );
  }, [graphData.links, selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId && !nodeById.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }

    if (hoveredNodeId && !nodeById.has(hoveredNodeId)) {
      setHoveredNodeId(null);
    }
  }, [hoveredNodeId, selectedNodeId, nodeById]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    const nextNodeId = node?.id ? String(node.id) : null;
    setHoveredNodeId((currentId) => (currentId === nextNodeId ? currentId : nextNodeId));

    if (containerRef.current) {
      containerRef.current.style.cursor = nextNodeId ? 'pointer' : 'default';
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.id === undefined) return;
      const nextNodeId = String(node.id);

      setSelectedNodeId((currentNodeId) => (currentNodeId === nextNodeId ? null : nextNodeId));

      if (node.x !== undefined && node.y !== undefined) {
        graphRef.current?.centerAt(node.x, node.y, ZOOM_TRANSITION_MS);
        graphRef.current?.zoom(SELECT_FOCUS_ZOOM, ZOOM_TRANSITION_MS);
      }
    },
    [],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default';
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const centerOnSelected = useCallback(() => {
    if (!selectedNodeId) return;
    const selectedNode = nodeById.get(selectedNodeId);
    if (!selectedNode || selectedNode.x === undefined || selectedNode.y === undefined) return;

    graphRef.current?.centerAt(selectedNode.x, selectedNode.y, ZOOM_TRANSITION_MS);
    graphRef.current?.zoom(SELECT_FOCUS_ZOOM, ZOOM_TRANSITION_MS);
  }, [nodeById, selectedNodeId]);
  const focusNodeById = useCallback(
    (nodeId: string | null, attemptsRemaining = 12) => {
      if (!nodeId) {
        return;
      }

      const targetNode = nodeById.get(nodeId);
      if (!targetNode || targetNode.x === undefined || targetNode.y === undefined) {
        if (attemptsRemaining > 0 && typeof window !== 'undefined') {
          if (focusFrameRef.current !== null) {
            window.cancelAnimationFrame(focusFrameRef.current);
          }
          focusFrameRef.current = window.requestAnimationFrame(() => {
            focusNodeById(nodeId, attemptsRemaining - 1);
          });
        }
        return;
      }

      if (focusFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }

      graphRef.current?.centerAt(targetNode.x, targetNode.y, ZOOM_TRANSITION_MS);
      graphRef.current?.zoom(SELECT_FOCUS_ZOOM, ZOOM_TRANSITION_MS);
    },
    [nodeById],
  );

  useEffect(() => {
    return () => {
      if (focusFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

  const isIncidentToActiveNode = useCallback(
    (link: CapsuleGraphLinkData) => isIncidentLink(link, visualFocusNodeId),
    [visualFocusNodeId],
  );

  const getNodeColor = useCallback(
    (node: CapsuleGraphNodeData) => {
      if (node.id === activeNodeId) return HIGHLIGHT_COLOR;
      if (normalizedSearchQuery) {
        if (focusedSearchNodeId && node.id === focusedSearchNodeId) {
          return HIGHLIGHT_COLOR;
        }
        if (matchedNodeIds.has(node.id)) {
          return node.color || '#94a3b8';
        }
        return DIMMED_NODE_COLOR;
      }
      if (!visualFocusNodeId) return node.color || '#94a3b8';
      return activeNeighbors.has(node.id) ? node.color || '#94a3b8' : DIMMED_NODE_COLOR;
    },
    [activeNodeId, activeNeighbors, focusedSearchNodeId, matchedNodeIds, normalizedSearchQuery, visualFocusNodeId],
  );

  const getLinkColor = useCallback(
    (link: CapsuleGraphLinkData) => {
      if (normalizedSearchQuery) {
        if (focusedSearchNodeId && isIncidentLink(link, focusedSearchNodeId)) {
          return HIGHLIGHT_COLOR;
        }
        const sourceId = extractGraphEndpointId(link.source);
        const targetId = extractGraphEndpointId(link.target);
        if (
          (sourceId && matchedNodeIds.has(sourceId)) ||
          (targetId && matchedNodeIds.has(targetId))
        ) {
          return link.color || BASE_LINK_COLOR;
        }
        return DIMMED_LINK_COLOR;
      }
      if (!visualFocusNodeId) return link.color || BASE_LINK_COLOR;
      return isIncidentToActiveNode(link) ? HIGHLIGHT_COLOR : DIMMED_LINK_COLOR;
    },
    [focusedSearchNodeId, isIncidentToActiveNode, matchedNodeIds, normalizedSearchQuery, visualFocusNodeId],
  );

  const getLinkWidth = useCallback(
    (link: CapsuleGraphLinkData) => {
      const weight = link.weight ?? 1;
      const baseWidth = isIncidentToActiveNode(link) ? 2 : 1;
      return baseWidth + Math.min(weight - 1, MAX_LINK_WEIGHT_BOOST);
    },
    [isIncidentToActiveNode],
  );

  const getLinkLabel = useCallback(
    (link: CapsuleGraphLinkData) => {
      if (!activeNodeId || !isIncidentToActiveNode(link)) return '';
      const weightSuffix = link.weight > 1 ? ` (${link.weight}x)` : '';
      return `${link.name}${weightSuffix}`;
    },
    [activeNodeId, isIncidentToActiveNode],
  );

  const handleZoomIn = useCallback(() => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom * ZOOM_STEP, ZOOM_TRANSITION_MS);
  }, []);

  const handleZoomOut = useCallback(() => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom / ZOOM_STEP, ZOOM_TRANSITION_MS);
  }, []);

  const handleZoomFit = useCallback(() => {
    graphRef.current?.zoomToFit(ZOOM_TRANSITION_MS, ZOOM_FIT_PADDING);
  }, []);
  const clearSelectionAndFit = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default';
    }
    graphRef.current?.zoomToFit(ZOOM_TRANSITION_MS, ZOOM_FIT_PADDING);
  }, []);

  const controlItems = useMemo<readonly GraphControl[]>(
    () => [
      { id: 'zoom-in', title: 'Zoom In', icon: ZoomInIcon, onClick: handleZoomIn },
      { id: 'zoom-out', title: 'Zoom Out', icon: ZoomOutIcon, onClick: handleZoomOut },
      {
        id: 'center-selected',
        title: 'Focus Selection',
        icon: TargetIcon,
        onClick: centerOnSelected,
        disabled: !selectedNodeId,
      },
      {
        id: 'fit',
        title: 'Fit to Screen',
        icon: FitIcon,
        onClick: handleZoomFit,
        dividerAfter: true,
      },
      {
        id: 'fullscreen',
        title: 'Toggle Fullscreen',
        icon: isFullscreen ? MinimizeIcon : MaximizeIcon,
        onClick: onToggleFullscreen,
      },
      {
        id: 'clear-selection',
        title: 'Clear Selection',
        icon: ClearIcon,
        onClick: clearSelection,
        disabled: !selectedNodeId,
      },
    ],
    [
      clearSelection,
      centerOnSelected,
      handleZoomIn,
      handleZoomOut,
      handleZoomFit,
      isFullscreen,
      onToggleFullscreen,
      selectedNodeId,
    ],
  );

  useEffect(() => {
    if (!focusedSearchNodeId || searchFocusToken === 0) {
      return;
    }

    focusNodeById(focusedSearchNodeId);
  }, [focusNodeById, focusedSearchNodeId, searchFocusToken]);

  useEffect(() => {
    const resolvedSearchSelectNodeId = resolveNodeId(searchSelectNodeId);

    if (!resolvedSearchSelectNodeId || searchSelectToken === 0) {
      return;
    }

    setHoveredNodeId(null);
    setSelectedNodeId(resolvedSearchSelectNodeId);
    focusNodeById(resolvedSearchSelectNodeId);
  }, [focusNodeById, resolveNodeId, searchSelectNodeId, searchSelectToken]);

  useEffect(() => {
    if (fitRequestToken === 0) {
      return;
    }

    graphRef.current?.zoomToFit(ZOOM_TRANSITION_MS, ZOOM_FIT_PADDING);
  }, [fitRequestToken]);

  useEffect(() => {
    if (clearSelectionToken === 0) {
      return;
    }

    setSelectedNodeId(null);
    setHoveredNodeId(null);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'default';
    }
  }, [clearSelectionToken]);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      clearSelectionAndFit();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSelectionAndFit, selectedNodeId]);

  if (capsules.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        Topology empty.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-900">
      <GraphControls controls={controlItems} />

      {isFullscreen && searchOverlay ? (
        <div className="absolute left-3 top-3 z-10 w-[min(420px,calc(100%-6rem))]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/85 p-2 shadow-lg backdrop-blur">
            {searchOverlay}
            {normalizedSearchQuery ? (
              <p className="px-1 pt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {matchedNodeCount > 0
                  ? `${matchedNodeCount} match${matchedNodeCount === 1 ? '' : 'es'}`
                  : 'No matches'}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedNode && (
        <div
          className={`absolute left-3 z-10 max-w-[72%] rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur ${
            isFullscreen && searchOverlay ? 'top-[5.75rem]' : 'top-3'
          }`}
        >
          <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Selected Node</p>
          <p className="truncate font-medium text-slate-100" title={selectedNode.name}>
            {selectedNode.name}
          </p>
          {selectedNode.name !== selectedNode.fullName && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500" title={selectedNode.fullName}>
              {selectedNode.fullName}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-400">
            {selectedNode.type} · {selectedLinkCount} connection{selectedLinkCount === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">{selectedNode.summary}</p>
          {selectedNodeHref && (
            <div className="mt-3 flex items-center gap-2">
              <a
                href={selectedNodeHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-400/15 hover:text-amber-100"
              >
                Open details
              </a>
              <span className="text-[10px] uppercase tracking-wide text-slate-500">new tab</span>
            </div>
          )}
        </div>
      )}

      <ForceGraph2D<CapsuleGraphNodeData, CapsuleGraphLinkData>
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeRelSize={NODE_REL_SIZE}
        nodeVal="val"
        nodeColor={getNodeColor}
        nodeLabel={buildCapsuleGraphTooltip}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkLabel={getLinkLabel}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link) => getLinkColor(link as CapsuleGraphLinkData)}
        backgroundColor={GRAPH_BACKGROUND}
      />
    </div>
  );
}
