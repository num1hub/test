export type CapsuleVisualProfileKey = 'mnemonic' | 'architect' | 'cinematic';
export type CapsuleGraphQualityKey = 'ultra' | 'balanced' | 'lite';

export type CapsuleVisualProfile = {
  key: CapsuleVisualProfileKey;
  label: string;
  hint: string;
  shapeAlphaBoost: number;
  faceAlphaBoost: number;
  faceScale: number;
  sigilScaleThreshold: number;
  heroLabelScaleThreshold: number;
  presenceAuraBoost: number;
  cardGlowBoost: number;
  borderBoost: number;
};

export type CapsuleGraphQuality = {
  key: CapsuleGraphQualityKey;
  label: string;
  hint: string;
  idleNodeAlpha: number;
  matchedNodeAlpha: number;
  dimmedNodeAlpha: number;
  idleLinkAlpha: number;
  matchedLinkAlpha: number;
  activeLinkAlpha: number;
  idleLinkWidth: number;
  matchedLinkWidth: number;
  activeLinkWidth: number;
  activeArrowLength: number;
  heroMarkBoost: number;
  vignetteAlpha: number;
  spotlightAlpha: number;
  cooldownTicks: number;
  alphaDecay: number;
  velocityDecay: number;
};

const DEFAULT_VISUAL_PROFILE: CapsuleVisualProfile = {
  key: 'mnemonic',
  label: 'Mnemonic',
  hint: 'Stronger family marks and faceprints for faster visual memory.',
  shapeAlphaBoost: 1.1,
  faceAlphaBoost: 1.16,
  faceScale: 1.06,
  sigilScaleThreshold: 1.45,
  heroLabelScaleThreshold: 1.18,
  presenceAuraBoost: 1.18,
  cardGlowBoost: 1.08,
  borderBoost: 1.08,
};

const DEFAULT_GRAPH_QUALITY: CapsuleGraphQuality = {
  key: 'balanced',
  label: 'Balanced',
  hint: 'Default readability with calmer links, softer dimming, and stable motion.',
  idleNodeAlpha: 0.94,
  matchedNodeAlpha: 0.98,
  dimmedNodeAlpha: 0.2,
  idleLinkAlpha: 0.14,
  matchedLinkAlpha: 0.26,
  activeLinkAlpha: 0.76,
  idleLinkWidth: 0.52,
  matchedLinkWidth: 0.78,
  activeLinkWidth: 1.3,
  activeArrowLength: 3.2,
  heroMarkBoost: 1,
  vignetteAlpha: 0.44,
  spotlightAlpha: 0.22,
  cooldownTicks: 78,
  alphaDecay: 0.078,
  velocityDecay: 0.36,
};

export const CAPSULE_VISUAL_PROFILES: readonly CapsuleVisualProfile[] = [
  DEFAULT_VISUAL_PROFILE,
  {
    key: 'architect',
    label: 'Architect',
    hint: 'Cleaner hierarchy, tighter chrome, and calmer emphasis on structure.',
    shapeAlphaBoost: 0.96,
    faceAlphaBoost: 0.92,
    faceScale: 0.96,
    sigilScaleThreshold: 1.3,
    heroLabelScaleThreshold: 1.12,
    presenceAuraBoost: 0.92,
    cardGlowBoost: 0.88,
    borderBoost: 0.96,
  },
  {
    key: 'cinematic',
    label: 'Cinema',
    hint: 'Softer glow and atmospheric marks for exploratory reading.',
    shapeAlphaBoost: 1.04,
    faceAlphaBoost: 0.94,
    faceScale: 1.02,
    sigilScaleThreshold: 1.7,
    heroLabelScaleThreshold: 1.34,
    presenceAuraBoost: 1.28,
    cardGlowBoost: 1.22,
    borderBoost: 1,
  },
];

export const CAPSULE_GRAPH_QUALITY_PRESETS: readonly CapsuleGraphQuality[] = [
  {
    key: 'ultra',
    label: 'Ultra',
    hint: 'Sharper links, deeper focus lighting, and slower settle for maximum visual richness.',
    idleNodeAlpha: 0.98,
    matchedNodeAlpha: 1,
    dimmedNodeAlpha: 0.28,
    idleLinkAlpha: 0.18,
    matchedLinkAlpha: 0.32,
    activeLinkAlpha: 0.82,
    idleLinkWidth: 0.6,
    matchedLinkWidth: 0.9,
    activeLinkWidth: 1.42,
    activeArrowLength: 3.6,
    heroMarkBoost: 1.14,
    vignetteAlpha: 0.54,
    spotlightAlpha: 0.3,
    cooldownTicks: 90,
    alphaDecay: 0.07,
    velocityDecay: 0.34,
  },
  DEFAULT_GRAPH_QUALITY,
  {
    key: 'lite',
    label: 'Lite',
    hint: 'Lower visual pressure, quieter nodes, and faster settle for laptop-friendly graph reading.',
    idleNodeAlpha: 0.88,
    matchedNodeAlpha: 0.94,
    dimmedNodeAlpha: 0.14,
    idleLinkAlpha: 0.1,
    matchedLinkAlpha: 0.22,
    activeLinkAlpha: 0.68,
    idleLinkWidth: 0.44,
    matchedLinkWidth: 0.7,
    activeLinkWidth: 1.16,
    activeArrowLength: 2.7,
    heroMarkBoost: 0.88,
    vignetteAlpha: 0.32,
    spotlightAlpha: 0.14,
    cooldownTicks: 60,
    alphaDecay: 0.085,
    velocityDecay: 0.4,
  },
];

export function resolveCapsuleVisualProfile(
  key: CapsuleVisualProfileKey | null | undefined,
): CapsuleVisualProfile {
  return CAPSULE_VISUAL_PROFILES.find((profile) => profile.key === key) ?? DEFAULT_VISUAL_PROFILE;
}

export function resolveCapsuleGraphQuality(
  key: CapsuleGraphQualityKey | null | undefined,
): CapsuleGraphQuality {
  return CAPSULE_GRAPH_QUALITY_PRESETS.find((profile) => profile.key === key) ?? DEFAULT_GRAPH_QUALITY;
}
