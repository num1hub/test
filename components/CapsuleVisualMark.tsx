'use client';

import { type CSSProperties } from 'react';
import { resolveCapsuleFaceprint } from '@/lib/capsuleFaceprint';
import type { CapsulePresenceTier } from '@/lib/capsulePresence';
import type {
  CapsuleVisualHeroMark,
  CapsuleVisualPalette,
  CapsuleVisualShape,
  CapsuleVisualSilhouette,
} from '@/lib/capsulePalette';
import { withAlpha } from '@/lib/capsulePalette';
import {
  resolveCapsuleVisualProfile,
  type CapsuleVisualProfileKey,
} from '@/lib/capsuleVisualProfile';

type CapsuleVisualMarkProps = {
  palette: CapsuleVisualPalette;
  capsuleId?: string | null;
  presenceTier?: CapsulePresenceTier;
  visualProfile?: CapsuleVisualProfileKey;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const MARK_DIMENSIONS = {
  sm: 36,
  md: 44,
  lg: 56,
} as const;

function shapeStroke(accent: string, alpha = 0.42): CSSProperties {
  return {
    borderColor: withAlpha(accent, alpha),
  };
}

function fillStroke(accent: string, alpha = 0.18): CSSProperties {
  return {
    backgroundColor: withAlpha(accent, alpha),
  };
}

function silhouetteBaseStyle(
  silhouette: CapsuleVisualSilhouette,
  accent: string,
  alpha: number,
  insetPercent: number,
): CSSProperties {
  const borderColor = withAlpha(accent, alpha);
  const inset = `${insetPercent}%`;

  switch (silhouette) {
    case 'circle':
      return {
        inset,
        borderRadius: '999px',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
    case 'pill':
      return {
        inset: `${insetPercent + 4}% ${Math.max(6, insetPercent - 2)}%`,
        borderRadius: '999px',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
    case 'diamond':
      return {
        inset,
        clipPath: 'polygon(50% 4%, 96% 50%, 50% 96%, 4% 50%)',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
    case 'hex':
      return {
        inset,
        clipPath: 'polygon(25% 6%, 75% 6%, 96% 50%, 75% 94%, 25% 94%, 4% 50%)',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
    case 'octagon':
      return {
        inset,
        clipPath: 'polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%)',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
    case 'square':
    default:
      return {
        inset,
        borderRadius: '0.95rem',
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
      };
  }
}

function renderSilhouette(
  silhouette: CapsuleVisualSilhouette,
  accent: string,
  hierarchyDepth: number,
  alphaBoost = 1,
) {
  const depth = Math.max(1, hierarchyDepth);
  const baseInsets = [8, 14, 20, 26].slice(0, depth);

  return (
    <>
      {baseInsets.map((inset, index) => {
        const alpha = Math.min(1, (index === 0 ? 0.44 : 0.18 + (depth - index) * 0.04) * alphaBoost);
        return (
          <span
            key={`silhouette-${inset}`}
            className="absolute"
            style={silhouetteBaseStyle(silhouette, accent, alpha, inset)}
          />
        );
      })}
    </>
  );
}

function renderPresenceTreatment(
  presenceTier: CapsulePresenceTier | undefined,
  accent: string,
  alphaBoost = 1,
) {
  const boost = (alpha: number) => Math.min(1, alpha * alphaBoost);

  switch (presenceTier) {
    case 'axis':
      return (
        <>
          <span className="absolute inset-[4%] rounded-[1.35rem] border" style={shapeStroke(accent, boost(0.34))} />
          <span className="absolute left-1/2 top-[4%] h-3 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.52))} />
          <span className="absolute left-1/2 bottom-[4%] h-3 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.52))} />
          <span className="absolute top-1/2 left-[4%] h-px w-3 -translate-y-1/2" style={fillStroke(accent, boost(0.52))} />
          <span className="absolute top-1/2 right-[4%] h-px w-3 -translate-y-1/2" style={fillStroke(accent, boost(0.52))} />
          <span className="absolute left-1/2 top-[10%] h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={fillStroke(accent, boost(0.84))} />
          <span className="absolute left-1/2 bottom-[10%] h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={fillStroke(accent, boost(0.84))} />
        </>
      );
    case 'major-hub':
      return (
        <>
          <span className="absolute inset-[6%] rounded-[1.15rem] border" style={shapeStroke(accent, boost(0.28))} />
          <span className="absolute left-[10%] top-[18%] bottom-[18%] w-px rounded-full" style={fillStroke(accent, boost(0.38))} />
          <span className="absolute right-[10%] top-[18%] bottom-[18%] w-px rounded-full" style={fillStroke(accent, boost(0.38))} />
          <span className="absolute left-[18%] right-[18%] bottom-[10%] h-px rounded-full" style={fillStroke(accent, boost(0.32))} />
        </>
      );
    case 'hub':
      return (
        <>
          <span className="absolute inset-[7%] rounded-[1.1rem] border" style={shapeStroke(accent, boost(0.22))} />
          <span className="absolute left-[16%] top-[16%] bottom-[16%] w-px rounded-full" style={fillStroke(accent, boost(0.24))} />
          <span className="absolute right-[16%] top-[16%] bottom-[16%] w-px rounded-full" style={fillStroke(accent, boost(0.24))} />
        </>
      );
    case 'core':
      return (
        <span className="absolute inset-[10%] rounded-[1rem] border" style={shapeStroke(accent, boost(0.18))} />
      );
    case 'capsule':
    default:
      return null;
  }
}

function renderHeroMark(
  heroMark: CapsuleVisualHeroMark,
  accent: string,
  alphaBoost = 1,
) {
  const boost = (alpha: number) => Math.min(1, alpha * alphaBoost);

  switch (heroMark) {
    case 'axis':
      return (
        <>
          <span className="absolute left-1/2 top-[8%] bottom-[8%] w-px -translate-x-1/2" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute top-1/2 left-[8%] right-[8%] h-px -translate-y-1/2" style={fillStroke(accent, boost(0.18))} />
        </>
      );
    case 'law':
      return (
        <>
          <span className="absolute left-[12%] top-[16%] bottom-[16%] w-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute right-[12%] top-[16%] bottom-[16%] w-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[12%] top-[16%] w-3 h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute right-[12%] top-[16%] w-3 h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[12%] bottom-[16%] w-3 h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute right-[12%] bottom-[16%] w-3 h-px" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'gates':
      return (
        <>
          <span className="absolute left-1/2 top-[8%] h-2 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.24))} />
          <span className="absolute left-1/2 bottom-[8%] h-2 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.24))} />
          <span className="absolute top-1/2 left-[8%] h-px w-2 -translate-y-1/2" style={fillStroke(accent, boost(0.24))} />
          <span className="absolute top-1/2 right-[8%] h-px w-2 -translate-y-1/2" style={fillStroke(accent, boost(0.24))} />
        </>
      );
    case 'runtime':
    case 'orchestration':
      return (
        <>
          <span className="absolute left-[14%] right-[14%] top-[18%] h-px rounded-full" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[18%] right-[18%] bottom-[18%] h-px rounded-full" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'habitat':
    case 'architecture':
      return (
        <>
          <span className="absolute left-[8%] top-[8%] h-3 w-3 border-l border-t" style={shapeStroke(accent, boost(0.18))} />
          <span className="absolute right-[8%] top-[8%] h-3 w-3 border-r border-t" style={shapeStroke(accent, boost(0.18))} />
          <span className="absolute left-[8%] bottom-[8%] h-3 w-3 border-b border-l" style={shapeStroke(accent, boost(0.18))} />
          <span className="absolute right-[8%] bottom-[8%] h-3 w-3 border-b border-r" style={shapeStroke(accent, boost(0.18))} />
        </>
      );
    case 'assistant':
      return (
        <>
          <span className="absolute left-[16%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" style={fillStroke(accent, boost(0.2))} />
          <span className="absolute right-[16%] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full" style={fillStroke(accent, boost(0.2))} />
          <span className="absolute left-1/2 top-[14%] h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={fillStroke(accent, boost(0.2))} />
        </>
      );
    case 'planning':
      return (
        <>
          <span className="absolute left-[14%] right-[14%] bottom-[14%] h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[24%] bottom-[14%] h-2 w-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-1/2 bottom-[14%] h-3 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute right-[24%] bottom-[14%] h-2 w-px" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'tracker':
      return (
        <>
          <span className="absolute left-[10%] top-[22%] bottom-[22%] w-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute right-[10%] top-[22%] bottom-[22%] w-px" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'refinery':
    case 'boundary':
      return (
        <>
          <span className="absolute inset-[12%] rotate-45 rounded-[0.55rem] border" style={shapeStroke(accent, boost(0.16))} />
        </>
      );
    case 'swarm':
      return (
        <>
          <span className="absolute left-[18%] top-[18%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, boost(0.2))} />
          <span className="absolute right-[18%] top-[18%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, boost(0.2))} />
          <span className="absolute left-[18%] bottom-[18%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, boost(0.2))} />
          <span className="absolute right-[18%] bottom-[18%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, boost(0.2))} />
        </>
      );
    case 'excavation':
      return (
        <>
          <span className="absolute left-[16%] right-[16%] bottom-[16%] h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[22%] right-[22%] bottom-[10%] h-px" style={fillStroke(accent, boost(0.12))} />
        </>
      );
    case 'world':
    case 'origin':
      return (
        <span className="absolute inset-[10%] rounded-full border" style={shapeStroke(accent, boost(0.14))} />
      );
    case 'governance':
      return (
        <>
          <span className="absolute left-[24%] top-[12%] h-2 w-px rotate-[-18deg]" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute left-1/2 top-[8%] h-3 w-px -translate-x-1/2" style={fillStroke(accent, boost(0.22))} />
          <span className="absolute right-[24%] top-[12%] h-2 w-px rotate-[18deg]" style={fillStroke(accent, boost(0.18))} />
        </>
      );
    case 'identity':
      return (
        <span className="absolute left-1/2 top-[10%] bottom-[10%] w-px -translate-x-1/2" style={fillStroke(accent, boost(0.16))} />
      );
    case 'economics':
      return (
        <>
          <span className="absolute left-[18%] right-[18%] top-[14%] h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[18%] right-[18%] bottom-[14%] h-px" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'archive':
      return (
        <>
          <span className="absolute left-[10%] top-[18%] bottom-[18%] w-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute right-[10%] top-[18%] bottom-[18%] w-px" style={fillStroke(accent, boost(0.16))} />
        </>
      );
    case 'spatial':
      return (
        <>
          <span className="absolute left-[14%] top-[14%] h-1 w-1 rounded-full" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute right-[14%] top-[14%] h-1 w-1 rounded-full" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute left-[14%] bottom-[14%] h-1 w-1 rounded-full" style={fillStroke(accent, boost(0.18))} />
          <span className="absolute right-[14%] bottom-[14%] h-1 w-1 rounded-full" style={fillStroke(accent, boost(0.18))} />
        </>
      );
    case 'interface':
      return (
        <>
          <span className="absolute left-[18%] right-[18%] top-[14%] h-px" style={fillStroke(accent, boost(0.16))} />
          <span className="absolute left-[34%] right-[34%] bottom-[14%] h-px" style={fillStroke(accent, boost(0.14))} />
        </>
      );
    case 'neutral':
    default:
      return null;
  }
}

function renderShape(shape: CapsuleVisualShape, accent: string, alphaBoost = 1) {
  const boost = (alpha: number) => Math.min(1, alpha * alphaBoost);
  switch (shape) {
    case 'orbit':
      return (
        <>
          <span className="absolute inset-[16%] rounded-full border" style={shapeStroke(accent, boost(0.42))} />
          <span className="absolute inset-[30%] rounded-full border" style={shapeStroke(accent, boost(0.32))} />
          <span className="absolute right-[18%] top-[22%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, boost(0.72))} />
        </>
      );
    case 'double-ring':
      return (
        <>
          <span className="absolute inset-[12%] rounded-full border-2" style={shapeStroke(accent, boost(0.5))} />
          <span className="absolute inset-[26%] rounded-full border" style={shapeStroke(accent, boost(0.34))} />
        </>
      );
    case 'gates':
      return (
        <>
          <span className="absolute inset-[16%] rounded-full border border-dashed" style={shapeStroke(accent, boost(0.52))} />
          <span className="absolute left-[24%] top-[24%] bottom-[24%] w-px" style={fillStroke(accent, boost(0.4))} />
          <span className="absolute right-[24%] top-[24%] bottom-[24%] w-px" style={fillStroke(accent, boost(0.4))} />
        </>
      );
    case 'wave':
      return (
        <>
          <span className="absolute left-[20%] right-[20%] top-[26%] h-1 rounded-full" style={fillStroke(accent, boost(0.26))} />
          <span className="absolute left-[14%] right-[14%] top-[45%] h-1 rounded-full" style={fillStroke(accent, boost(0.4))} />
          <span className="absolute left-[24%] right-[24%] bottom-[24%] h-1 rounded-full" style={fillStroke(accent, boost(0.26))} />
        </>
      );
    case 'pill':
      return (
        <>
          <span className="absolute left-[18%] right-[18%] top-[34%] bottom-[34%] rounded-full border" style={shapeStroke(accent, boost(0.46))} />
          <span className="absolute left-[28%] top-[44%] h-2 w-2 rounded-full" style={fillStroke(accent, boost(0.72))} />
        </>
      );
    case 'grid':
      return (
        <>
          <span className="absolute inset-[18%] rounded-lg border" style={shapeStroke(accent, 0.44)} />
          <span className="absolute left-1/2 top-[18%] bottom-[18%] w-px -translate-x-1/2" style={fillStroke(accent, 0.28)} />
          <span className="absolute top-1/2 left-[18%] right-[18%] h-px -translate-y-1/2" style={fillStroke(accent, 0.28)} />
        </>
      );
    case 'diamond':
      return (
        <>
          <span className="absolute inset-[22%] rotate-45 rounded-[0.4rem] border" style={shapeStroke(accent, 0.46)} />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={fillStroke(accent, 0.7)} />
        </>
      );
    case 'frame':
      return (
        <>
          <span className="absolute left-[16%] top-[16%] h-3 w-3 border-l border-t" style={shapeStroke(accent, 0.46)} />
          <span className="absolute right-[16%] top-[16%] h-3 w-3 border-r border-t" style={shapeStroke(accent, 0.46)} />
          <span className="absolute left-[16%] bottom-[16%] h-3 w-3 border-b border-l" style={shapeStroke(accent, 0.46)} />
          <span className="absolute right-[16%] bottom-[16%] h-3 w-3 border-b border-r" style={shapeStroke(accent, 0.46)} />
        </>
      );
    case 'horizon':
      return (
        <>
          <span className="absolute left-[18%] right-[18%] bottom-[26%] h-px" style={fillStroke(accent, 0.48)} />
          <span className="absolute left-[30%] right-[30%] top-[28%] h-2 rounded-b-full border-b" style={shapeStroke(accent, 0.38)} />
        </>
      );
    case 'lanes':
      return (
        <>
          <span className="absolute left-[28%] top-[20%] bottom-[20%] w-1 rounded-full" style={fillStroke(accent, 0.22)} />
          <span className="absolute left-1/2 top-[16%] bottom-[16%] w-1 -translate-x-1/2 rounded-full" style={fillStroke(accent, 0.42)} />
          <span className="absolute right-[28%] top-[20%] bottom-[20%] w-1 rounded-full" style={fillStroke(accent, 0.22)} />
        </>
      );
    case 'bloom':
      return (
        <>
          <span className="absolute inset-[26%] rounded-full border" style={shapeStroke(accent, 0.4)} />
          <span className="absolute left-1/2 top-[18%] h-2 w-2 -translate-x-1/2 rounded-full" style={fillStroke(accent, 0.72)} />
          <span className="absolute left-[18%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={fillStroke(accent, 0.56)} />
          <span className="absolute right-[18%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={fillStroke(accent, 0.56)} />
          <span className="absolute left-1/2 bottom-[18%] h-2 w-2 -translate-x-1/2 rounded-full" style={fillStroke(accent, 0.72)} />
        </>
      );
    case 'strata':
      return (
        <>
          <span className="absolute left-[16%] right-[16%] top-[26%] h-1 rounded-full" style={fillStroke(accent, 0.24)} />
          <span className="absolute left-[24%] right-[24%] top-[44%] h-1 rounded-full" style={fillStroke(accent, 0.38)} />
          <span className="absolute left-[14%] right-[14%] bottom-[24%] h-1 rounded-full" style={fillStroke(accent, 0.24)} />
        </>
      );
    case 'crown':
      return (
        <>
          <span className="absolute left-[18%] right-[18%] bottom-[24%] h-px" style={fillStroke(accent, 0.42)} />
          <span className="absolute left-[24%] top-[24%] h-3 w-px rotate-[-18deg]" style={fillStroke(accent, 0.5)} />
          <span className="absolute left-1/2 top-[18%] h-4 w-px -translate-x-1/2" style={fillStroke(accent, 0.6)} />
          <span className="absolute right-[24%] top-[24%] h-3 w-px rotate-[18deg]" style={fillStroke(accent, 0.5)} />
        </>
      );
    case 'spine':
      return (
        <>
          <span className="absolute left-1/2 top-[18%] bottom-[18%] w-px -translate-x-1/2" style={fillStroke(accent, 0.46)} />
          <span className="absolute left-1/2 top-[22%] h-2 w-2 -translate-x-1/2 rounded-full" style={fillStroke(accent, 0.72)} />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={fillStroke(accent, 0.56)} />
          <span className="absolute left-1/2 bottom-[22%] h-2 w-2 -translate-x-1/2 rounded-full" style={fillStroke(accent, 0.72)} />
        </>
      );
    case 'stack':
      return (
        <>
          <span className="absolute left-[20%] right-[20%] top-[22%] h-3 rounded-full border" style={shapeStroke(accent, 0.42)} />
          <span className="absolute left-[18%] right-[18%] top-[42%] h-3 rounded-full border" style={shapeStroke(accent, 0.34)} />
          <span className="absolute left-[22%] right-[22%] bottom-[18%] h-3 rounded-full border" style={shapeStroke(accent, 0.42)} />
        </>
      );
    case 'archive':
      return (
        <>
          <span className="absolute inset-[18%] rounded-lg border" style={shapeStroke(accent, 0.4)} />
          <span className="absolute left-[24%] right-[24%] top-[34%] h-px" style={fillStroke(accent, 0.3)} />
          <span className="absolute left-[24%] right-[30%] top-[50%] h-px" style={fillStroke(accent, 0.3)} />
          <span className="absolute left-[24%] right-[20%] top-[66%] h-px" style={fillStroke(accent, 0.3)} />
        </>
      );
    case 'screen':
      return (
        <>
          <span className="absolute inset-[18%] rounded-lg border" style={shapeStroke(accent, 0.42)} />
          <span className="absolute left-[24%] right-[24%] top-[28%] h-1 rounded-full" style={fillStroke(accent, 0.26)} />
          <span className="absolute left-[34%] right-[34%] bottom-[22%] h-1 rounded-full" style={fillStroke(accent, 0.18)} />
        </>
      );
    case 'compass':
      return (
        <>
          <span className="absolute left-1/2 top-[16%] bottom-[16%] w-px -translate-x-1/2" style={fillStroke(accent, 0.42)} />
          <span className="absolute top-1/2 left-[16%] right-[16%] h-px -translate-y-1/2" style={fillStroke(accent, 0.42)} />
          <span className="absolute inset-[30%] rounded-full border" style={shapeStroke(accent, 0.32)} />
        </>
      );
    case 'constellation':
      return (
        <>
          <span className="absolute left-[22%] top-[32%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, 0.68)} />
          <span className="absolute right-[26%] top-[24%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, 0.72)} />
          <span className="absolute left-[34%] bottom-[24%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, 0.58)} />
          <span className="absolute right-[22%] bottom-[30%] h-1.5 w-1.5 rounded-full" style={fillStroke(accent, 0.64)} />
          <span className="absolute left-[26%] top-[34%] right-[30%] h-px rotate-[10deg]" style={fillStroke(accent, 0.3)} />
          <span className="absolute left-[36%] right-[22%] bottom-[28%] h-px -rotate-[12deg]" style={fillStroke(accent, 0.24)} />
        </>
      );
    default:
      return null;
  }
}

function renderFaceprint(capsuleId: string, accent: string, alphaBoost = 1, scale = 1) {
  const faceprint = resolveCapsuleFaceprint(capsuleId);
  const glyphInset = '34%';

  return (
    <>
      {Array.from({ length: Math.max(0, faceprint.ringCount - 1) }).map((_, index) => {
        const inset = 26 + index * 10;
        return (
          <span
            key={`ring-${inset}`}
            className="absolute rounded-full border"
            style={{
              ...shapeStroke(accent, Math.min(1, (0.16 + index * 0.08) * alphaBoost)),
              inset: `${inset}%`,
            }}
          />
        );
      })}

      {faceprint.bandMask.map((active, index) => {
        if (!active) return null;
        const top = 34 + index * 14;
        return (
          <span
            key={`band-${index}`}
            className="absolute left-[24%] right-[24%] h-px rounded-full"
            style={{
              ...fillStroke(accent, Math.min(1, (0.14 + index * 0.07) * alphaBoost)),
              top: `${top}%`,
            }}
          />
        );
      })}

      {faceprint.constellation.map((point, index) => {
        const size = 5 + point.r * 24;
        const left = 50 + point.x * 32;
        const top = 50 + point.y * 32;
        return (
          <span
            key={`point-${index}`}
            className="absolute rounded-full"
            style={{
              backgroundColor: withAlpha(accent, Math.min(1, point.opacity * alphaBoost)),
              width: `${size}%`,
              height: `${size}%`,
              left: `${left}%`,
              top: `${top}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              boxShadow: `0 0 10px ${withAlpha(accent, Math.min(1, point.opacity * 0.4 * alphaBoost))}`,
            }}
          />
        );
      })}

      {faceprint.glyph === 'dot' ? (
        <span
          className="absolute rounded-full"
          style={{
            ...fillStroke(accent, Math.min(1, 0.22 * alphaBoost)),
            inset: glyphInset,
            transform: `scale(${scale})`,
          }}
        />
      ) : null}

      {faceprint.glyph === 'square' ? (
        <span
          className="absolute border"
          style={{
            ...shapeStroke(accent, Math.min(1, 0.24 * alphaBoost)),
            inset: glyphInset,
            borderRadius: '0.55rem',
            transform: `scale(${scale})`,
          }}
        />
      ) : null}

      {faceprint.glyph === 'diamond' ? (
        <span
          className="absolute rotate-45 rounded-[0.32rem] border"
          style={{
            ...shapeStroke(accent, Math.min(1, 0.24 * alphaBoost)),
            inset: glyphInset,
            transform: `scale(${scale}) rotate(45deg)`,
          }}
        />
      ) : null}

      {faceprint.glyph === 'triangle' ? (
        <span
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            width: 0,
            height: 0,
            transform: `translate(-50%, -50%) scale(${scale})`,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `12px solid ${withAlpha(accent, Math.min(1, 0.22 * alphaBoost))}`,
          }}
        />
      ) : null}
    </>
  );
}

export default function CapsuleVisualMark({
  palette,
  capsuleId,
  presenceTier,
  visualProfile,
  size = 'md',
  className = '',
}: CapsuleVisualMarkProps) {
  const dimension = MARK_DIMENSIONS[size];
  const sigilFontSize = size === 'lg' ? '11px' : size === 'md' ? '10px' : '9px';
  const profile = resolveCapsuleVisualProfile(visualProfile);

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl border bg-slate-950/80 ${className}`.trim()}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        borderColor: withAlpha(palette.accent, 0.34 * profile.borderBoost),
        boxShadow: `0 18px 44px -30px ${withAlpha(palette.accent, 0.18 * profile.cardGlowBoost)}`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 22%, ${withAlpha(palette.accent, 0.18 * profile.cardGlowBoost)} 0%, ${withAlpha(palette.accent, 0.08 * profile.cardGlowBoost)} 32%, rgba(2,6,23,0.08) 62%, rgba(2,6,23,0.02) 100%)`,
        }}
      />
      {renderHeroMark(
        palette.heroMark,
        palette.accent,
        profile.borderBoost,
      )}
      {renderPresenceTreatment(
        presenceTier,
        palette.accent,
        profile.presenceAuraBoost,
      )}
      {renderSilhouette(
        palette.silhouette,
        palette.accent,
        palette.hierarchyDepth,
        profile.borderBoost,
      )}
      {renderShape(palette.shape, palette.accent, profile.shapeAlphaBoost)}
      {capsuleId
        ? renderFaceprint(capsuleId, palette.accent, profile.faceAlphaBoost, profile.faceScale)
        : null}
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-semibold uppercase tracking-[0.24em]"
        style={{
          color: withAlpha(palette.accent, 0.92),
          fontSize: sigilFontSize,
          textShadow: `0 0 18px ${withAlpha(palette.accent, 0.24 * profile.cardGlowBoost)}`,
        }}
      >
        {palette.sigil}
      </div>
    </div>
  );
}
