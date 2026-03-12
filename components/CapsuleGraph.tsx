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
import { withAlpha } from '@/lib/capsulePalette';
import { isHeroPresenceTier } from '@/lib/capsulePresence';
import {
  resolveCapsuleGraphQuality,
  resolveCapsuleVisualProfile,
  type CapsuleGraphQuality,
  type CapsuleGraphQualityKey,
  type CapsuleVisualProfile,
  type CapsuleVisualProfileKey,
} from '@/lib/capsuleVisualProfile';
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
  visualProfile?: CapsuleVisualProfileKey;
  graphQuality?: CapsuleGraphQualityKey;
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
const GRAPH_AMBIENT_COLOR = '#38bdf8';
const HIGHLIGHT_COLOR = '#fbbf24';
const BASE_LINK_COLOR = '#64748b';
const DIMMED_LINK_COLOR = 'rgba(100, 116, 139, 0.08)';
const ZOOM_STEP = 1.2;
const ZOOM_TRANSITION_MS = 400;
const ZOOM_FIT_PADDING = 50;
const NODE_REL_SIZE = 1;
const SELECT_FOCUS_ZOOM = 1.75;
const MAX_LINK_WEIGHT_BOOST = 2.5;
const NODE_ACTIVE_RING_WIDTH = 2.2;
const NODE_IDLE_RING_WIDTH = 1.05;

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

function drawNodeMotif(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  globalScale: number,
  alpha: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const lineWidth = 1 / globalScale;
  const stroke = withAlpha(node.originalColor, alpha);
  const fill = withAlpha(node.originalColor, alpha * 0.78);

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = lineWidth;

  switch (node.paletteShape) {
    case 'double-ring':
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.72, 0, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case 'gates':
      ctx.setLineDash([2 / globalScale, 2 / globalScale]);
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.88, 0, 2 * Math.PI, false);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillRect(x - radius * 0.54, y - radius * 0.62, lineWidth, radius * 1.24);
      ctx.fillRect(x + radius * 0.54, y - radius * 0.62, lineWidth, radius * 1.24);
      break;
    case 'wave':
      for (const offset of [-radius * 0.34, 0, radius * 0.34]) {
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.58, y + offset);
        ctx.quadraticCurveTo(x, y + offset - radius * 0.18, x + radius * 0.58, y + offset);
        ctx.stroke();
      }
      break;
    case 'pill':
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.62, y - radius * 0.24, radius * 1.24, radius * 0.48, radius * 0.24);
      ctx.stroke();
      break;
    case 'grid':
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.66, y - radius * 0.66, radius * 1.32, radius * 1.32, radius * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 0.66);
      ctx.lineTo(x, y + radius * 0.66);
      ctx.moveTo(x - radius * 0.66, y);
      ctx.lineTo(x + radius * 0.66, y);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.roundRect(-radius * 0.48, -radius * 0.48, radius * 0.96, radius * 0.96, radius * 0.14);
      ctx.stroke();
      ctx.restore();
      break;
    case 'frame':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.68, y - radius * 0.18);
      ctx.lineTo(x - radius * 0.68, y - radius * 0.68);
      ctx.lineTo(x - radius * 0.18, y - radius * 0.68);
      ctx.moveTo(x + radius * 0.68, y - radius * 0.18);
      ctx.lineTo(x + radius * 0.68, y - radius * 0.68);
      ctx.lineTo(x + radius * 0.18, y - radius * 0.68);
      ctx.moveTo(x - radius * 0.68, y + radius * 0.18);
      ctx.lineTo(x - radius * 0.68, y + radius * 0.68);
      ctx.lineTo(x - radius * 0.18, y + radius * 0.68);
      ctx.moveTo(x + radius * 0.68, y + radius * 0.18);
      ctx.lineTo(x + radius * 0.68, y + radius * 0.68);
      ctx.lineTo(x + radius * 0.18, y + radius * 0.68);
      ctx.stroke();
      break;
    case 'horizon':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.64, y + radius * 0.36);
      ctx.lineTo(x + radius * 0.64, y + radius * 0.36);
      ctx.moveTo(x - radius * 0.38, y - radius * 0.08);
      ctx.quadraticCurveTo(x, y - radius * 0.34, x + radius * 0.38, y - radius * 0.08);
      ctx.stroke();
      break;
    case 'lanes':
      for (const offset of [-radius * 0.4, 0, radius * 0.4]) {
        ctx.fillRect(x + offset - lineWidth / 2, y - radius * 0.62, lineWidth, radius * 1.24);
      }
      break;
    case 'bloom':
      for (const [dx, dy] of [
        [0, -radius * 0.56],
        [-radius * 0.56, 0],
        [radius * 0.56, 0],
        [0, radius * 0.56],
      ]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, radius * 0.13, 0, 2 * Math.PI, false);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.52, 0, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case 'strata':
      for (const [factor, width] of [
        [-0.34, 0.9],
        [0, 0.68],
        [0.34, 0.98],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x - radius * width * 0.5, y + radius * factor);
        ctx.lineTo(x + radius * width * 0.5, y + radius * factor);
        ctx.stroke();
      }
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.54, y + radius * 0.28);
      ctx.lineTo(x - radius * 0.2, y - radius * 0.4);
      ctx.lineTo(x, y - radius * 0.08);
      ctx.lineTo(x + radius * 0.2, y - radius * 0.4);
      ctx.lineTo(x + radius * 0.54, y + radius * 0.28);
      ctx.stroke();
      break;
    case 'spine':
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 0.68);
      ctx.lineTo(x, y + radius * 0.68);
      ctx.stroke();
      for (const offset of [-radius * 0.42, 0, radius * 0.42]) {
        ctx.beginPath();
        ctx.arc(x, y + offset, radius * 0.12, 0, 2 * Math.PI, false);
        ctx.fill();
      }
      break;
    case 'stack':
      for (const offset of [-radius * 0.26, 0, radius * 0.26]) {
        ctx.beginPath();
        ctx.ellipse(x, y + offset, radius * 0.58, radius * 0.22, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      break;
    case 'archive':
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.58, y - radius * 0.58, radius * 1.16, radius * 1.16, radius * 0.16);
      ctx.stroke();
      for (const offset of [-radius * 0.22, 0, radius * 0.22]) {
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.34, y + offset);
        ctx.lineTo(x + radius * 0.3, y + offset);
        ctx.stroke();
      }
      break;
    case 'screen':
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.66, y - radius * 0.56, radius * 1.32, radius * 1.12, radius * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.48, y - radius * 0.24);
      ctx.lineTo(x + radius * 0.48, y - radius * 0.24);
      ctx.stroke();
      break;
    case 'compass':
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 0.72);
      ctx.lineTo(x, y + radius * 0.72);
      ctx.moveTo(x - radius * 0.72, y);
      ctx.lineTo(x + radius * 0.72, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.4, 0, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case 'constellation':
      for (const [dx, dy] of [
        [-radius * 0.48, -radius * 0.18],
        [radius * 0.36, -radius * 0.34],
        [-radius * 0.12, radius * 0.42],
        [radius * 0.48, radius * 0.16],
      ]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, radius * 0.08, 0, 2 * Math.PI, false);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.48, y - radius * 0.18);
      ctx.lineTo(x + radius * 0.36, y - radius * 0.34);
      ctx.lineTo(x + radius * 0.48, y + radius * 0.16);
      ctx.moveTo(x - radius * 0.12, y + radius * 0.42);
      ctx.lineTo(x + radius * 0.48, y + radius * 0.16);
      ctx.stroke();
      break;
    default:
      break;
  }

  ctx.restore();
}

function drawSilhouettePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  silhouette: string,
) {
  switch (silhouette) {
    case 'pill':
      ctx.beginPath();
      ctx.roundRect(
        x - radius * 0.92,
        y - radius * 0.62,
        radius * 1.84,
        radius * 1.24,
        radius * 0.48,
      );
      return;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y + radius);
      ctx.lineTo(x - radius, y);
      ctx.closePath();
      return;
    case 'hex':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.52, y - radius * 0.9);
      ctx.lineTo(x + radius * 0.52, y - radius * 0.9);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x + radius * 0.52, y + radius * 0.9);
      ctx.lineTo(x - radius * 0.52, y + radius * 0.9);
      ctx.lineTo(x - radius, y);
      ctx.closePath();
      return;
    case 'octagon':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.38, y - radius);
      ctx.lineTo(x + radius * 0.38, y - radius);
      ctx.lineTo(x + radius, y - radius * 0.38);
      ctx.lineTo(x + radius, y + radius * 0.38);
      ctx.lineTo(x + radius * 0.38, y + radius);
      ctx.lineTo(x - radius * 0.38, y + radius);
      ctx.lineTo(x - radius, y + radius * 0.38);
      ctx.lineTo(x - radius, y - radius * 0.38);
      ctx.closePath();
      return;
    case 'square':
      ctx.beginPath();
      ctx.roundRect(
        x - radius * 0.84,
        y - radius * 0.84,
        radius * 1.68,
        radius * 1.68,
        radius * 0.28,
      );
      return;
    case 'circle':
    default:
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  }
}

function drawNodeSilhouette(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  globalScale: number,
  activeAlpha: number,
  fillAlpha: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const silhouette = node.paletteSilhouette || 'circle';
  const depth = Math.max(1, node.paletteHierarchyDepth ?? 1);
  const contourFactors = Array.from({ length: depth }, (_, index) => 1 + index * 0.12).reverse();

  ctx.save();
  ctx.lineWidth = 1 / globalScale;

  contourFactors.forEach((factor, index) => {
    drawSilhouettePath(ctx, x, y, radius * factor, silhouette);
    if (index === contourFactors.length - 1) {
      ctx.fillStyle = withAlpha(node.originalColor, fillAlpha);
      ctx.fill();
    }
    ctx.strokeStyle = withAlpha(
      node.originalColor,
      Math.max(0.14, activeAlpha * (0.92 - index * 0.18)),
    );
    ctx.lineWidth =
      ((index === contourFactors.length - 1 ? NODE_ACTIVE_RING_WIDTH : NODE_IDLE_RING_WIDTH) *
        (index === contourFactors.length - 1 ? 1 : 0.9)) /
      globalScale;
    ctx.stroke();
  });

  ctx.restore();
}

function getPresenceAuraStyle(
  tier: string | undefined,
  isActive: boolean,
  isMatched: boolean,
) {
  switch (tier) {
    case 'axis':
      return {
        sizeBoost: isActive ? 1.38 : 1.24,
        alpha: isActive ? 0.26 : isMatched ? 0.17 : 0.12,
      };
    case 'major-hub':
      return {
        sizeBoost: isActive ? 1.28 : 1.16,
        alpha: isActive ? 0.2 : isMatched ? 0.14 : 0.1,
      };
    case 'hub':
      return {
        sizeBoost: isActive ? 1.18 : 1.1,
        alpha: isActive ? 0.14 : isMatched ? 0.1 : 0.07,
      };
    case 'core':
      return {
        sizeBoost: isActive ? 1.1 : 1.05,
        alpha: isActive ? 0.1 : isMatched ? 0.07 : 0.05,
      };
    case 'capsule':
    default:
      return {
        sizeBoost: isActive ? 1.04 : 1,
        alpha: isActive ? 0.06 : isMatched ? 0.05 : 0.03,
      };
  }
}

function buildGraphBackdropStyle(
  accent: string,
  quality: CapsuleGraphQuality,
  profile: CapsuleVisualProfile,
) {
  const spotlightCore = withAlpha(
    accent,
    Math.min(0.28, quality.spotlightAlpha * 0.68 * profile.presenceAuraBoost),
  );
  const spotlightHalo = withAlpha(
    accent,
    Math.min(0.22, quality.spotlightAlpha * 0.46 * profile.cardGlowBoost),
  );
  const upperWash = withAlpha('#1e293b', 0.18 + quality.vignetteAlpha * 0.16);
  const sideGlow = withAlpha(accent, Math.min(0.16, quality.spotlightAlpha * 0.28));
  const rimShade = withAlpha(GRAPH_BACKGROUND, Math.min(0.94, 0.46 + quality.vignetteAlpha));
  const lowerBasin = withAlpha('#020617', Math.min(0.9, 0.28 + quality.vignetteAlpha * 0.68));

  return {
    backgroundColor: GRAPH_BACKGROUND,
    backgroundImage: [
      `radial-gradient(circle at 50% 48%, ${spotlightCore} 0%, ${spotlightHalo} 16%, rgba(2, 6, 23, 0) 42%)`,
      `radial-gradient(circle at 16% 18%, ${sideGlow} 0%, rgba(2, 6, 23, 0) 28%)`,
      `radial-gradient(circle at 84% 16%, ${withAlpha('#0f172a', 0.24 + quality.vignetteAlpha * 0.12)} 0%, rgba(2, 6, 23, 0) 30%)`,
      `linear-gradient(180deg, ${upperWash} 0%, rgba(2, 6, 23, 0.04) 34%, rgba(2, 6, 23, 0.12) 68%, ${lowerBasin} 100%)`,
      `radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0) 56%, ${rimShade} 100%)`,
    ].join(', '),
  };
}

function drawNodePresenceAura(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  isActive: boolean,
  isMatched: boolean,
  auraBoost: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const { sizeBoost, alpha } = getPresenceAuraStyle(node.presenceTier, isActive, isMatched);

  if (alpha <= 0) {
    return;
  }

  ctx.save();
  drawSilhouettePath(ctx, x, y, radius * sizeBoost, node.paletteSilhouette || 'circle');
  ctx.fillStyle = withAlpha(node.originalColor, Math.min(0.34, alpha * auraBoost));
  ctx.fill();
  ctx.restore();
}

function drawNodePresenceBeacons(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  globalScale: number,
  auraBoost: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const alpha = Math.min(1, 0.56 * auraBoost);
  const lineWidth = 1 / globalScale;

  ctx.save();
  ctx.strokeStyle = withAlpha(node.originalColor, alpha);
  ctx.fillStyle = withAlpha(node.originalColor, Math.min(1, 0.72 * auraBoost));
  ctx.lineWidth = lineWidth;

  switch (node.presenceTier) {
    case 'axis':
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(x + dx * radius * 1.08, y + dy * radius * 1.08);
        ctx.lineTo(x + dx * radius * 1.34, y + dy * radius * 1.34);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          x + dx * radius * 1.42,
          y + dy * radius * 1.42,
          Math.max(1 / globalScale, radius * 0.08),
          0,
          2 * Math.PI,
          false,
        );
        ctx.fill();
      }
      break;
    case 'major-hub':
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        ctx.beginPath();
        ctx.arc(
          x + dx * radius * 0.98,
          y + dy * radius * 0.98,
          Math.max(0.8 / globalScale, radius * 0.065),
          0,
          2 * Math.PI,
          false,
        );
        ctx.fill();
      }
      break;
    case 'hub':
      ctx.beginPath();
      ctx.moveTo(x - radius * 1.18, y);
      ctx.lineTo(x - radius * 0.98, y);
      ctx.moveTo(x + radius * 0.98, y);
      ctx.lineTo(x + radius * 1.18, y);
      ctx.stroke();
      break;
    default:
      break;
  }

  ctx.restore();
}

function drawNodeHeroMark(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  globalScale: number,
  alpha: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const stroke = withAlpha(node.originalColor, alpha);
  const fill = withAlpha(node.originalColor, Math.min(1, alpha * 1.1));

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = 0.85 / globalScale;

  switch (node.paletteHeroMark) {
    case 'axis':
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 1.18);
      ctx.lineTo(x, y - radius * 1.36);
      ctx.moveTo(x + radius * 1.18, y);
      ctx.lineTo(x + radius * 1.36, y);
      ctx.moveTo(x, y + radius * 1.18);
      ctx.lineTo(x, y + radius * 1.36);
      ctx.moveTo(x - radius * 1.18, y);
      ctx.lineTo(x - radius * 1.36, y);
      ctx.stroke();
      break;
    case 'law':
      ctx.beginPath();
      ctx.moveTo(x - radius * 1.08, y - radius * 0.68);
      ctx.lineTo(x - radius * 1.08, y + radius * 0.68);
      ctx.moveTo(x + radius * 1.08, y - radius * 0.68);
      ctx.lineTo(x + radius * 1.08, y + radius * 0.68);
      ctx.stroke();
      break;
    case 'gates':
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.18, 0, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case 'runtime':
    case 'orchestration':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.92, y - radius * 0.92);
      ctx.quadraticCurveTo(x, y - radius * 1.08, x + radius * 0.92, y - radius * 0.92);
      ctx.moveTo(x - radius * 0.92, y + radius * 0.92);
      ctx.quadraticCurveTo(x, y + radius * 1.08, x + radius * 0.92, y + radius * 0.92);
      ctx.stroke();
      break;
    case 'habitat':
    case 'architecture':
      ctx.beginPath();
      ctx.roundRect(
        x - radius * 1.18,
        y - radius * 1.18,
        radius * 2.36,
        radius * 2.36,
        radius * 0.24,
      );
      ctx.stroke();
      break;
    case 'assistant':
      for (const [dx, dy] of [
        [0, -1.16],
        [1.04, 0.28],
        [-1.04, 0.28],
      ] as const) {
        ctx.beginPath();
        ctx.arc(
          x + dx * radius,
          y + dy * radius,
          Math.max(0.9 / globalScale, radius * 0.07),
          0,
          2 * Math.PI,
          false,
        );
        ctx.fill();
      }
      break;
    case 'planning':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.98, y + radius * 1.02);
      ctx.lineTo(x + radius * 0.98, y + radius * 1.02);
      ctx.stroke();
      break;
    case 'tracker':
      ctx.beginPath();
      ctx.moveTo(x - radius * 1.16, y - radius * 0.82);
      ctx.lineTo(x - radius * 1.16, y + radius * 0.82);
      ctx.moveTo(x + radius * 1.16, y - radius * 0.82);
      ctx.lineTo(x + radius * 1.16, y + radius * 0.82);
      ctx.stroke();
      break;
    case 'refinery':
    case 'boundary':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.roundRect(-radius * 0.94, -radius * 0.94, radius * 1.88, radius * 1.88, radius * 0.14);
      ctx.stroke();
      ctx.restore();
      break;
    case 'swarm':
      for (const [dx, dy] of [
        [-1.08, -1.08],
        [1.08, -1.08],
        [1.08, 1.08],
        [-1.08, 1.08],
      ] as const) {
        ctx.beginPath();
        ctx.arc(
          x + dx * radius * 0.72,
          y + dy * radius * 0.72,
          Math.max(0.8 / globalScale, radius * 0.06),
          0,
          2 * Math.PI,
          false,
        );
        ctx.fill();
      }
      break;
    case 'excavation':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.98, y + radius * 0.98);
      ctx.lineTo(x + radius * 0.98, y + radius * 0.98);
      ctx.moveTo(x - radius * 0.76, y + radius * 1.16);
      ctx.lineTo(x + radius * 0.76, y + radius * 1.16);
      ctx.stroke();
      break;
    case 'world':
    case 'origin':
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.2, 0, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case 'governance':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.52, y - radius * 1.08);
      ctx.lineTo(x - radius * 0.16, y - radius * 1.26);
      ctx.lineTo(x, y - radius * 1.02);
      ctx.lineTo(x + radius * 0.16, y - radius * 1.26);
      ctx.lineTo(x + radius * 0.52, y - radius * 1.08);
      ctx.stroke();
      break;
    case 'identity':
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 1.18);
      ctx.lineTo(x, y + radius * 1.18);
      ctx.stroke();
      break;
    case 'economics':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.88, y - radius * 1.02);
      ctx.lineTo(x + radius * 0.88, y - radius * 1.02);
      ctx.moveTo(x - radius * 0.88, y + radius * 1.02);
      ctx.lineTo(x + radius * 0.88, y + radius * 1.02);
      ctx.stroke();
      break;
    case 'archive':
      ctx.beginPath();
      ctx.moveTo(x - radius * 1.02, y - radius * 0.84);
      ctx.lineTo(x - radius * 1.02, y + radius * 0.84);
      ctx.moveTo(x + radius * 1.02, y - radius * 0.84);
      ctx.lineTo(x + radius * 1.02, y + radius * 0.84);
      ctx.stroke();
      break;
    case 'spatial':
      for (const [dx, dy] of [
        [-1.02, -1.02],
        [1.02, -1.02],
        [-1.02, 1.02],
        [1.02, 1.02],
      ] as const) {
        ctx.beginPath();
        ctx.arc(
          x + dx * radius * 0.78,
          y + dy * radius * 0.78,
          Math.max(0.7 / globalScale, radius * 0.045),
          0,
          2 * Math.PI,
          false,
        );
        ctx.fill();
      }
      break;
    case 'interface':
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.86, y - radius * 1.02);
      ctx.lineTo(x + radius * 0.86, y - radius * 1.02);
      ctx.moveTo(x - radius * 0.46, y + radius * 1.02);
      ctx.lineTo(x + radius * 0.46, y + radius * 1.02);
      ctx.stroke();
      break;
    case 'neutral':
    default:
      break;
  }

  ctx.restore();
}

function drawNodeFaceprint(
  ctx: CanvasRenderingContext2D,
  node: GraphNodeRecord,
  radius: number,
  globalScale: number,
  alpha: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const stroke = withAlpha(node.originalColor, alpha);
  const fill = withAlpha(node.originalColor, alpha * 0.8);
  const lineWidth = 0.9 / globalScale;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = lineWidth;

  for (let index = 1; index < (node.faceRingCount ?? 1); index += 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.32 + index * 0.14), 0, 2 * Math.PI, false);
    ctx.stroke();
  }

  (node.faceBandMask ?? []).forEach((active, index) => {
    if (!active) return;
    const offset = (-0.24 + index * 0.24) * radius;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.42, y + offset);
    ctx.lineTo(x + radius * 0.42, y + offset);
    ctx.stroke();
  });

  (node.faceConstellation ?? []).forEach((point) => {
    ctx.beginPath();
    ctx.arc(
      x + point.x * radius * 0.82,
      y + point.y * radius * 0.82,
      Math.max(0.8 / globalScale, point.r * radius * 0.28),
      0,
      2 * Math.PI,
      false,
    );
    ctx.fillStyle = withAlpha(node.originalColor, point.opacity * alpha);
    ctx.fill();
  });

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;

  switch (node.faceGlyph) {
    case 'diamond':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.roundRect(-radius * 0.16, -radius * 0.16, radius * 0.32, radius * 0.32, radius * 0.08);
      ctx.stroke();
      ctx.restore();
      break;
    case 'square':
      ctx.beginPath();
      ctx.roundRect(x - radius * 0.18, y - radius * 0.18, radius * 0.36, radius * 0.36, radius * 0.08);
      ctx.stroke();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 0.22);
      ctx.lineTo(x + radius * 0.2, y + radius * 0.14);
      ctx.lineTo(x - radius * 0.2, y + radius * 0.14);
      ctx.closePath();
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.12, 0, 2 * Math.PI, false);
      ctx.fill();
      break;
  }

  ctx.restore();
}

export default function CapsuleGraph({
  capsules,
  getNodeHref,
  activeBranch = null,
  visualProfile,
  graphQuality,
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
  const quality = useMemo(() => resolveCapsuleGraphQuality(graphQuality), [graphQuality]);
  const profile = useMemo(() => resolveCapsuleVisualProfile(visualProfile), [visualProfile]);

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
  const backdropAccent = useMemo(() => {
    if (visualFocusNodeId) {
      return nodeById.get(visualFocusNodeId)?.originalColor ?? GRAPH_AMBIENT_COLOR;
    }

    const matchedNode = graphData.nodes.find((node) => matchedNodeIds.has(node.id));
    if (matchedNode) {
      return matchedNode.originalColor;
    }

    return GRAPH_AMBIENT_COLOR;
  }, [graphData.nodes, matchedNodeIds, nodeById, visualFocusNodeId]);
  const graphBackdropStyle = useMemo(
    () => buildGraphBackdropStyle(backdropAccent, quality, profile),
    [backdropAccent, profile, quality],
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
          return withAlpha(node.color || '#94a3b8', quality.matchedNodeAlpha);
        }
        return withAlpha(node.color || '#94a3b8', quality.dimmedNodeAlpha);
      }
      if (!visualFocusNodeId) {
        return withAlpha(node.color || '#94a3b8', quality.idleNodeAlpha);
      }
      return activeNeighbors.has(node.id)
        ? withAlpha(node.color || '#94a3b8', quality.idleNodeAlpha)
        : withAlpha(node.color || '#94a3b8', quality.dimmedNodeAlpha);
    },
    [
      activeNodeId,
      activeNeighbors,
      focusedSearchNodeId,
      matchedNodeIds,
      normalizedSearchQuery,
      quality.dimmedNodeAlpha,
      quality.idleNodeAlpha,
      quality.matchedNodeAlpha,
      visualFocusNodeId,
    ],
  );

  const getLinkColor = useCallback(
    (link: CapsuleGraphLinkData) => {
      const accent = link.color || BASE_LINK_COLOR;

      if (normalizedSearchQuery) {
        if (focusedSearchNodeId && isIncidentLink(link, focusedSearchNodeId)) {
          return withAlpha(accent, quality.activeLinkAlpha);
        }
        const sourceId = extractGraphEndpointId(link.source);
        const targetId = extractGraphEndpointId(link.target);
        if (
          (sourceId && matchedNodeIds.has(sourceId)) ||
          (targetId && matchedNodeIds.has(targetId))
        ) {
          return withAlpha(accent, quality.matchedLinkAlpha);
        }
        return DIMMED_LINK_COLOR;
      }
      if (!visualFocusNodeId) return withAlpha(accent, quality.idleLinkAlpha);
      return isIncidentToActiveNode(link)
        ? withAlpha(accent, quality.activeLinkAlpha)
        : DIMMED_LINK_COLOR;
    },
    [
      focusedSearchNodeId,
      isIncidentToActiveNode,
      matchedNodeIds,
      normalizedSearchQuery,
      quality.activeLinkAlpha,
      quality.idleLinkAlpha,
      quality.matchedLinkAlpha,
      visualFocusNodeId,
    ],
  );

  const getLinkWidth = useCallback(
    (link: CapsuleGraphLinkData) => {
      const weight = link.weight ?? 1;
      const weightBoost = Math.min(Math.max(weight - 1, 0), MAX_LINK_WEIGHT_BOOST) * 0.22;

      if (normalizedSearchQuery) {
        if (focusedSearchNodeId && isIncidentLink(link, focusedSearchNodeId)) {
          return quality.activeLinkWidth + weightBoost;
        }

        const sourceId = extractGraphEndpointId(link.source);
        const targetId = extractGraphEndpointId(link.target);
        if (
          (sourceId && matchedNodeIds.has(sourceId)) ||
          (targetId && matchedNodeIds.has(targetId))
        ) {
          return quality.matchedLinkWidth + weightBoost * 0.65;
        }

        return 0.35;
      }

      if (!visualFocusNodeId) {
        return quality.idleLinkWidth + weightBoost;
      }

      return isIncidentToActiveNode(link) ? quality.activeLinkWidth + weightBoost : 0.3;
    },
    [
      focusedSearchNodeId,
      isIncidentToActiveNode,
      matchedNodeIds,
      normalizedSearchQuery,
      quality.activeLinkWidth,
      quality.idleLinkWidth,
      quality.matchedLinkWidth,
      visualFocusNodeId,
    ],
  );

  const getLinkArrowLength = useCallback(
    (link: CapsuleGraphLinkData) => {
      if (normalizedSearchQuery) {
        return focusedSearchNodeId && isIncidentLink(link, focusedSearchNodeId)
          ? quality.activeArrowLength
          : 0;
      }

      if (!visualFocusNodeId) {
        return 0;
      }

      return isIncidentToActiveNode(link) ? quality.activeArrowLength : 0;
    },
    [focusedSearchNodeId, isIncidentToActiveNode, normalizedSearchQuery, quality.activeArrowLength, visualFocusNodeId],
  );

  const getLinkLabel = useCallback(
    (link: CapsuleGraphLinkData) => {
      if (!activeNodeId || !isIncidentToActiveNode(link)) return '';
      const weightSuffix = link.weight > 1 ? ` (${link.weight}x)` : '';
      return `${link.name}${weightSuffix}`;
    },
    [activeNodeId, isIncidentToActiveNode],
  );

  const paintNode = useCallback(
    (
      node: NodeObject<CapsuleGraphNodeData>,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => {
      const graphNode = node as GraphNodeRecord;
      const radius = Math.max(3.2, Math.sqrt(Math.max(graphNode.val ?? 1, 1)) * NODE_REL_SIZE);
      const isActive =
        graphNode.id === activeNodeId || graphNode.id === focusedSearchNodeId;
      const isMatched = matchedNodeIds.has(graphNode.id);
      const visibleSigil =
        isActive || isMatched || globalScale >= profile.sigilScaleThreshold;
      const heroPresence = isHeroPresenceTier(
        (graphNode.presenceTier as Parameters<typeof isHeroPresenceTier>[0]) ?? 'capsule',
      );
      const visibleHeroLabel =
        isActive || (heroPresence && globalScale >= profile.heroLabelScaleThreshold);
      const presenceRadius =
        radius * Math.max(1, (graphNode.presenceScale ?? 1) * 0.98);

      ctx.save();
      drawNodePresenceAura(
        ctx,
        graphNode,
        presenceRadius + 1.2,
        isActive,
        isMatched,
        profile.presenceAuraBoost,
      );
      drawNodePresenceBeacons(
        ctx,
        graphNode,
        presenceRadius,
        globalScale,
        profile.presenceAuraBoost,
      );
      drawNodeHeroMark(
        ctx,
        graphNode,
        presenceRadius,
        globalScale,
        (isActive ? 0.44 : isMatched ? 0.26 : 0.14) * profile.borderBoost * quality.heroMarkBoost,
      );
      drawNodeSilhouette(
        ctx,
        graphNode,
        presenceRadius + 0.85,
        globalScale,
        isActive ? 0.9 : isMatched ? 0.5 : 0.28,
        isActive ? 0.12 : isMatched ? 0.08 : 0.05,
      );

      drawNodeMotif(
        ctx,
        graphNode,
        presenceRadius,
        globalScale,
        isActive ? 0.88 * profile.shapeAlphaBoost : isMatched ? 0.5 * profile.shapeAlphaBoost : 0.26 * profile.shapeAlphaBoost,
      );
      drawNodeFaceprint(
        ctx,
        graphNode,
        presenceRadius,
        globalScale,
        isActive ? 0.82 * profile.faceAlphaBoost : isMatched ? 0.48 * profile.faceAlphaBoost : 0.24 * profile.faceAlphaBoost,
      );

      if (visibleSigil) {
        const fontSize = Math.max(8, 10 / globalScale);
        ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const sigil = graphNode.paletteSigil;
        const paddingX = 4 / globalScale;
        const paddingY = 2 / globalScale;
        const metrics = ctx.measureText(sigil);
        const labelWidth = metrics.width + paddingX * 2;
        const labelHeight = fontSize + paddingY * 2;
        const labelX = (graphNode.x ?? 0);
        const labelY = (graphNode.y ?? 0) - presenceRadius - 8 / globalScale;

        ctx.fillStyle = withAlpha(GRAPH_BACKGROUND, 0.82);
        ctx.strokeStyle = withAlpha(graphNode.originalColor, 0.4);
        ctx.lineWidth = 0.9 / globalScale;
        ctx.beginPath();
        ctx.roundRect(
          labelX - labelWidth / 2,
          labelY - labelHeight / 2,
          labelWidth,
          labelHeight,
          4 / globalScale,
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = withAlpha(graphNode.originalColor, isActive ? 1 : 0.9);
        ctx.fillText(sigil, labelX, labelY);
      }

      if (visibleHeroLabel) {
        const heroLabel = heroPresence ? graphNode.faceTag : graphNode.presenceLabel;
        const fontSize = Math.max(7, 8.5 / globalScale);
        ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(heroLabel);
        const paddingX = 4 / globalScale;
        const paddingY = 1.5 / globalScale;
        const labelWidth = metrics.width + paddingX * 2;
        const labelHeight = fontSize + paddingY * 2;
        const labelX = graphNode.x ?? 0;
        const labelY = (graphNode.y ?? 0) + presenceRadius + 8 / globalScale;

        ctx.fillStyle = withAlpha(GRAPH_BACKGROUND, heroPresence ? 0.76 : 0.66);
        ctx.strokeStyle = withAlpha(graphNode.originalColor, heroPresence ? 0.42 : 0.26);
        ctx.lineWidth = 0.8 / globalScale;
        ctx.beginPath();
        ctx.roundRect(
          labelX - labelWidth / 2,
          labelY - labelHeight / 2,
          labelWidth,
          labelHeight,
          4 / globalScale,
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = withAlpha(graphNode.originalColor, heroPresence ? 0.98 : 0.9);
        ctx.fillText(heroLabel, labelX, labelY);
      }

      ctx.restore();
    },
    [
      activeNodeId,
      focusedSearchNodeId,
      matchedNodeIds,
      profile.faceAlphaBoost,
      profile.shapeAlphaBoost,
      profile.heroLabelScaleThreshold,
      profile.presenceAuraBoost,
      profile.sigilScaleThreshold,
      quality.heroMarkBoost,
    ],
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
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-900"
      style={graphBackdropStyle}
    >
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
          style={{
            borderColor: withAlpha(selectedNode.originalColor, 0.38),
            boxShadow: `0 18px 48px -30px ${withAlpha(selectedNode.originalColor, 0.42)}`,
          }}
        >
          <p
            className="mb-1 text-[11px] uppercase tracking-wide"
            style={{ color: withAlpha(selectedNode.originalColor, 0.92) }}
          >
            [{selectedNode.paletteSigil}] {selectedNode.paletteLabel} · {selectedNode.presenceLabel}
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: withAlpha(selectedNode.originalColor, 0.88) }}
          >
            {selectedNode.paletteRankLabel} · {selectedNode.paletteTone} · Face {selectedNode.faceTag}
          </p>
          <p className="truncate font-medium text-slate-100" title={selectedNode.name}>
            {selectedNode.name}
          </p>
          {selectedNode.name !== selectedNode.fullName && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500" title={selectedNode.fullName}>
              {selectedNode.fullName}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-400">
            {selectedNode.subtype} · {selectedLinkCount} connection{selectedLinkCount === 1 ? '' : 's'} · silhouette {selectedNode.paletteSilhouette}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {selectedNode.presenceTier} presence · hierarchy {selectedNode.paletteHierarchyDepth}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: withAlpha(selectedNode.originalColor, 0.92) }}>
            {selectedNode.paletteMemoryCue}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">{selectedNode.summary}</p>
          {selectedNodeHref && (
            <div className="mt-3 flex items-center gap-2">
              <a
                href={selectedNodeHref}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition-colors hover:border-amber-300 hover:bg-amber-400/15 hover:text-amber-100"
                style={{
                  borderColor: withAlpha(selectedNode.originalColor, 0.42),
                  backgroundColor: withAlpha(selectedNode.originalColor, 0.12),
                  color: withAlpha(selectedNode.originalColor, 0.95),
                }}
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
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'after'}
        nodeLabel={buildCapsuleGraphTooltip}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkLabel={getLinkLabel}
        linkDirectionalArrowLength={getLinkArrowLength}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={(link) => getLinkColor(link as CapsuleGraphLinkData)}
        cooldownTicks={quality.cooldownTicks}
        d3AlphaDecay={quality.alphaDecay}
        d3VelocityDecay={quality.velocityDecay}
        backgroundColor="rgba(0, 0, 0, 0)"
      />
    </div>
  );
}
