import type { CapsuleMetadata } from '@/types/capsule'
import type { CapsuleVisualPalette } from '@/lib/capsulePalette'

export type CapsulePresenceTier =
  | 'axis'
  | 'major-hub'
  | 'hub'
  | 'core'
  | 'capsule'

export type CapsulePresence = {
  tier: CapsulePresenceTier
  label: string
  description: string
  scaleBoost: number
  haloBoost: number
  ringBoost: number
}

export const CAPSULE_PRESENCE_LEGEND: readonly {
  tier: CapsulePresenceTier
  label: string
  description: string
}[] = [
  {
    tier: 'axis',
    label: 'Axis Surface',
    description:
      'Constitutional center of gravity. These capsules define the vault’s main directional spine.',
  },
  {
    tier: 'major-hub',
    label: 'Major Hub',
    description:
      'High-density hub with many live routes. Reads as a map center, not just a node.',
  },
  {
    tier: 'hub',
    label: 'Hub Surface',
    description:
      'Compositional capsule that gathers a lane, habitat, or subsystem into one readable surface.',
  },
  {
    tier: 'core',
    label: 'Core Surface',
    description:
      'Important doctrinal or system-building capsule, but not a graph center of gravity.',
  },
  {
    tier: 'capsule',
    label: 'Capsule Surface',
    description:
      'Ordinary atomic surface. Still unique in faceprint and family, but not visually dominant.',
  },
] as const

export function isHeroPresenceTier(tier: CapsulePresenceTier): boolean {
  return tier === 'axis' || tier === 'major-hub'
}

type CapsulePresenceInput = {
  metadata: Pick<CapsuleMetadata, 'subtype'>
  palette: Pick<CapsuleVisualPalette, 'hierarchyDepth'>
  linkCount?: number
}

export function resolveCapsulePresence({
  metadata,
  palette,
  linkCount = 0,
}: CapsulePresenceInput): CapsulePresence {
  if (palette.hierarchyDepth >= 4) {
    return {
      tier: 'axis',
      label: 'Axis Surface',
      description:
        'Constitutional center of gravity. These capsules define the vault’s main directional spine.',
      scaleBoost: 1.24,
      haloBoost: 1.3,
      ringBoost: 1.18,
    }
  }

  if (metadata.subtype === 'hub' && linkCount >= 10) {
    return {
      tier: 'major-hub',
      label: 'Major Hub',
      description:
        'High-density hub with many live routes. Reads as a map center, not just a node.',
      scaleBoost: 1.18,
      haloBoost: 1.18,
      ringBoost: 1.12,
    }
  }

  if (metadata.subtype === 'hub') {
    return {
      tier: 'hub',
      label: 'Hub Surface',
      description:
        'Compositional capsule that gathers a lane, habitat, or subsystem into one readable surface.',
      scaleBoost: 1.11,
      haloBoost: 1.1,
      ringBoost: 1.08,
    }
  }

  if (palette.hierarchyDepth >= 3) {
    return {
      tier: 'core',
      label: 'Core Surface',
      description:
        'Important doctrinal or system-building capsule, but not a graph center of gravity.',
      scaleBoost: 1.07,
      haloBoost: 1.04,
      ringBoost: 1.04,
    }
  }

  return {
    tier: 'capsule',
    label: 'Capsule Surface',
    description:
      'Ordinary atomic surface. Still unique in faceprint and family, but not visually dominant.',
    scaleBoost: 1,
    haloBoost: 1,
    ringBoost: 1,
  }
}
