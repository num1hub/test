import type { CapsuleMetadata, CapsuleType } from '@/types/capsule';

type CapsulePaletteSeed = {
  label: string;
  accent: string;
  tone: string;
  sigil: string;
};

export type CapsuleVisualShape =
  | 'orbit'
  | 'double-ring'
  | 'gates'
  | 'wave'
  | 'pill'
  | 'grid'
  | 'diamond'
  | 'frame'
  | 'horizon'
  | 'lanes'
  | 'bloom'
  | 'strata'
  | 'crown'
  | 'spine'
  | 'stack'
  | 'archive'
  | 'screen'
  | 'compass'
  | 'constellation';

export type CapsuleVisualSilhouette =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'pill'
  | 'hex'
  | 'octagon';

export type CapsuleVisualHeroMark =
  | 'axis'
  | 'law'
  | 'gates'
  | 'runtime'
  | 'habitat'
  | 'assistant'
  | 'planning'
  | 'tracker'
  | 'refinery'
  | 'orchestration'
  | 'swarm'
  | 'excavation'
  | 'world'
  | 'governance'
  | 'identity'
  | 'economics'
  | 'archive'
  | 'spatial'
  | 'interface'
  | 'architecture'
  | 'boundary'
  | 'origin'
  | 'neutral';

type CapsuleVisualPersona = {
  motif: string;
  shape: CapsuleVisualShape;
  memoryCue: string;
  rankLabel: string;
  silhouette: CapsuleVisualSilhouette;
  hierarchyDepth: number;
};

export type CapsuleVisualPalette = {
  key: string;
  label: string;
  tone: string;
  sigil: string;
  motif: string;
  shape: CapsuleVisualShape;
  memoryCue: string;
  rankLabel: string;
  silhouette: CapsuleVisualSilhouette;
  heroMark: CapsuleVisualHeroMark;
  hierarchyDepth: number;
  accent: string;
  badgeText: string;
  badgeBorder: string;
  badgeBackground: string;
  cardBorder: string;
  cardGlow: string;
  accentLine: string;
  graphNode: string;
};

export type CapsuleVisualLegendItem = {
  key: string;
  label: string;
  tone: string;
  sigil: string;
  motif: string;
  shape: CapsuleVisualShape;
  memoryCue: string;
  rankLabel: string;
  silhouette: CapsuleVisualSilhouette;
  heroMark: CapsuleVisualHeroMark;
  hierarchyDepth: number;
  accent: string;
  description: string;
};

const DEFAULT_NODE_COLOR = '#94a3b8';
const UNKNOWN_PALETTE: CapsulePaletteSeed = {
  label: 'Capsule',
  accent: DEFAULT_NODE_COLOR,
  tone: 'Slate',
  sigil: 'CP',
};

const TYPE_DEFAULTS: Record<CapsuleType, CapsulePaletteSeed> = {
  foundation: {
    label: 'Foundation',
    accent: '#d4b15a',
    tone: 'Gold',
    sigil: 'FD',
  },
  concept: {
    label: 'Concept',
    accent: '#69a7dc',
    tone: 'Blue',
    sigil: 'CN',
  },
  operations: {
    label: 'Operations',
    accent: '#5bbf90',
    tone: 'Jade',
    sigil: 'OP',
  },
  physical_object: {
    label: 'Physical Object',
    accent: '#d79059',
    tone: 'Copper',
    sigil: 'PH',
  },
  project: {
    label: 'Project',
    accent: '#a889df',
    tone: 'Orchid',
    sigil: 'PJ',
  },
};

const PALETTE_SEEDS: Record<string, CapsulePaletteSeed> = {
  'capsuleos-core': {
    label: 'CapsuleOS Core',
    accent: '#d8b35a',
    tone: 'Brass Gold',
    sigil: 'OS',
  },
  'capsuleos-law': {
    label: 'CapsuleOS Law',
    accent: '#e0c57a',
    tone: 'Archive Gold',
    sigil: 'LW',
  },
  'capsuleos-gates': {
    label: 'Validation Gates',
    accent: '#d87a5f',
    tone: 'Ember',
    sigil: 'GT',
  },
  'capsuleos-runtime': {
    label: 'CapsuleOS Runtime',
    accent: '#5cb6a8',
    tone: 'Sea Teal',
    sigil: 'RT',
  },
  'capsuleos-status': {
    label: 'CapsuleOS Status',
    accent: '#73bf8d',
    tone: 'Moss',
    sigil: 'ST',
  },
  'capsuleos-taxonomy': {
    label: 'CapsuleOS Taxonomy',
    accent: '#8f90dd',
    tone: 'Iris',
    sigil: 'TX',
  },
  'capsuleos-protocol': {
    label: 'CapsuleOS Protocol',
    accent: '#67a8d7',
    tone: 'Azure',
    sigil: 'PX',
  },
  origin: {
    label: 'Origin Core',
    accent: '#d7ccb0',
    tone: 'Bone',
    sigil: 'OR',
  },
  a2c: {
    label: 'A2C',
    accent: '#5fc5d8',
    tone: 'Cyan',
    sigil: 'A2',
  },
  symphony: {
    label: 'Symphony',
    accent: '#b28de7',
    tone: 'Orchid',
    sigil: 'SY',
  },
  'n-infinity': {
    label: 'N-Infinity',
    accent: '#cf7cb9',
    tone: 'Rose',
    sigil: 'NI',
  },
  workspace: {
    label: 'Workspace',
    accent: '#79bf84',
    tone: 'Grove Green',
    sigil: 'WS',
  },
  tracker: {
    label: 'Tracker',
    accent: '#5eaec9',
    tone: 'Harbor Teal',
    sigil: 'TR',
  },
  planning: {
    label: 'Planning',
    accent: '#9fc86d',
    tone: 'Olive',
    sigil: 'PL',
  },
  assistant: {
    label: 'Assistant',
    accent: '#7aa5e2',
    tone: 'Cobalt',
    sigil: 'AI',
  },
  deepmine: {
    label: 'DeepMine',
    accent: '#d48b57',
    tone: 'Copper',
    sigil: 'DM',
  },
  n1hub: {
    label: 'N1Hub Habitat',
    accent: '#7c8fe3',
    tone: 'Royal Indigo',
    sigil: 'NH',
  },
  'graph-maintenance': {
    label: 'Graph Maintenance',
    accent: '#62c4a1',
    tone: 'Viridian',
    sigil: 'CG',
  },
  'key-agents': {
    label: 'Key Agents',
    accent: '#9a8de0',
    tone: 'Lane Violet',
    sigil: 'KA',
  },
  'night-shift': {
    label: 'Night Shift',
    accent: '#7aa7d8',
    tone: 'Moon Blue',
    sigil: 'NS',
  },
  runtime: {
    label: 'Runtime',
    accent: '#58b2a1',
    tone: 'Lagoon',
    sigil: 'BG',
  },
  governance: {
    label: 'Governance',
    accent: '#c7727d',
    tone: 'Mulberry',
    sigil: 'GV',
  },
  identity: {
    label: 'Identity',
    accent: '#7e98c8',
    tone: 'Steel Blue',
    sigil: 'ID',
  },
  economics: {
    label: 'Economics',
    accent: '#d7a95d',
    tone: 'Saffron',
    sigil: 'EC',
  },
  knowledge: {
    label: 'Knowledge',
    accent: '#78c2ba',
    tone: 'Sea Glass',
    sigil: 'KN',
  },
  spatial: {
    label: 'Spatial',
    accent: '#75b9c6',
    tone: 'Ceramic Aqua',
    sigil: 'SP',
  },
  control: {
    label: 'Control Surface',
    accent: '#8899e1',
    tone: 'Periwinkle',
    sigil: 'UI',
  },
  architecture: {
    label: 'Architecture',
    accent: '#8ea97a',
    tone: 'Stone Sage',
    sigil: 'AR',
  },
  integration: {
    label: 'Integration Boundary',
    accent: '#6b8ecf',
    tone: 'Tide Blue',
    sigil: 'IX',
  },
};

const DEFAULT_PERSONA: CapsuleVisualPersona = {
  motif: 'Vault pulse',
  shape: 'orbit',
  memoryCue: 'neutral capsule signature',
  rankLabel: 'Capsule Surface',
  silhouette: 'circle',
  hierarchyDepth: 1,
};

const PALETTE_PERSONAS: Record<string, CapsuleVisualPersona> = {
  'capsuleos-core': {
    motif: 'Sovereign orbit',
    shape: 'orbit',
    memoryCue: 'constitutional center of gravity',
    rankLabel: 'Constitutional Axis',
    silhouette: 'circle',
    hierarchyDepth: 4,
  },
  'capsuleos-law': {
    motif: 'Double law ring',
    shape: 'double-ring',
    memoryCue: 'boundary, rule, and admission weight',
    rankLabel: 'Law Surface',
    silhouette: 'hex',
    hierarchyDepth: 4,
  },
  'capsuleos-gates': {
    motif: 'Gate teeth',
    shape: 'gates',
    memoryCue: 'validator pressure and trust thresholds',
    rankLabel: 'Gate Surface',
    silhouette: 'octagon',
    hierarchyDepth: 4,
  },
  'capsuleos-runtime': {
    motif: 'Runtime tide',
    shape: 'wave',
    memoryCue: 'system motion, stewardship, and substrate flow',
    rankLabel: 'Runtime Flow',
    silhouette: 'pill',
    hierarchyDepth: 3,
  },
  'capsuleos-status': {
    motif: 'Lifecycle pill',
    shape: 'pill',
    memoryCue: 'state posture and capsule condition',
    rankLabel: 'Lifecycle Surface',
    silhouette: 'pill',
    hierarchyDepth: 2,
  },
  'capsuleos-taxonomy': {
    motif: 'Taxonomy grid',
    shape: 'grid',
    memoryCue: 'types, classes, and relation grammar',
    rankLabel: 'Taxonomy Surface',
    silhouette: 'square',
    hierarchyDepth: 3,
  },
  'capsuleos-protocol': {
    motif: 'Protocol diamond',
    shape: 'diamond',
    memoryCue: 'hashes, vectors, and precise mechanics',
    rankLabel: 'Protocol Surface',
    silhouette: 'diamond',
    hierarchyDepth: 3,
  },
  workspace: {
    motif: 'Habitat frame',
    shape: 'frame',
    memoryCue: 'operator habitat and compositional desk',
    rankLabel: 'Habitat Lens',
    silhouette: 'square',
    hierarchyDepth: 3,
  },
  assistant: {
    motif: 'Conversation lanes',
    shape: 'lanes',
    memoryCue: 'dialogue, agency, and handoff continuity',
    rankLabel: 'Intelligence Surface',
    silhouette: 'circle',
    hierarchyDepth: 2,
  },
  planning: {
    motif: 'Horizon line',
    shape: 'horizon',
    memoryCue: 'goals, milestones, and future shaping',
    rankLabel: 'Planning Surface',
    silhouette: 'hex',
    hierarchyDepth: 2,
  },
  tracker: {
    motif: 'Signal lanes',
    shape: 'lanes',
    memoryCue: 'pressure, telemetry, and accountability flow',
    rankLabel: 'Tracking Surface',
    silhouette: 'square',
    hierarchyDepth: 2,
  },
  a2c: {
    motif: 'Refinery diamond',
    shape: 'diamond',
    memoryCue: 'conversion, admission, and material preparation',
    rankLabel: 'Refinery Surface',
    silhouette: 'diamond',
    hierarchyDepth: 3,
  },
  symphony: {
    motif: 'Orchestration wave',
    shape: 'wave',
    memoryCue: 'session flow, intake, and runtime coordination',
    rankLabel: 'Orchestration Surface',
    silhouette: 'pill',
    hierarchyDepth: 3,
  },
  'n-infinity': {
    motif: 'Swarm bloom',
    shape: 'bloom',
    memoryCue: 'parallel synthesis, swarm fabric, and bounded emergence',
    rankLabel: 'Swarm Surface',
    silhouette: 'hex',
    hierarchyDepth: 3,
  },
  deepmine: {
    motif: 'Excavation strata',
    shape: 'strata',
    memoryCue: 'quarry depth, extraction, and mined signal',
    rankLabel: 'Excavation Surface',
    silhouette: 'hex',
    hierarchyDepth: 2,
  },
  n1hub: {
    motif: 'Habitat constellation',
    shape: 'constellation',
    memoryCue: 'runtime habitat, doctrine, and operator world-building',
    rankLabel: 'Habitat Axis',
    silhouette: 'circle',
    hierarchyDepth: 3,
  },
  'graph-maintenance': {
    motif: 'Maintenance mesh',
    shape: 'grid',
    memoryCue: 'repair, arbitration, synthesis pressure, and graph upkeep',
    rankLabel: 'Maintenance Surface',
    silhouette: 'square',
    hierarchyDepth: 2,
  },
  'key-agents': {
    motif: 'Lane roster',
    shape: 'lanes',
    memoryCue: 'role topology, lane ownership, and agent map clarity',
    rankLabel: 'Lane Surface',
    silhouette: 'hex',
    hierarchyDepth: 2,
  },
  'night-shift': {
    motif: 'Midnight horizon',
    shape: 'horizon',
    memoryCue: 'autonomy window, handoff rhythm, and off-peak execution posture',
    rankLabel: 'Autonomy Window',
    silhouette: 'pill',
    hierarchyDepth: 2,
  },
  runtime: {
    motif: 'Service wave',
    shape: 'wave',
    memoryCue: 'background execution and maintenance loops',
    rankLabel: 'Runtime Surface',
    silhouette: 'pill',
    hierarchyDepth: 2,
  },
  governance: {
    motif: 'Crown seal',
    shape: 'crown',
    memoryCue: 'review, policy, override, and trust authority',
    rankLabel: 'Governance Surface',
    silhouette: 'octagon',
    hierarchyDepth: 3,
  },
  identity: {
    motif: 'Identity spine',
    shape: 'spine',
    memoryCue: 'profile, role, entitlement, and continuity',
    rankLabel: 'Identity Surface',
    silhouette: 'circle',
    hierarchyDepth: 2,
  },
  economics: {
    motif: 'Value stack',
    shape: 'stack',
    memoryCue: 'wallet posture, supply, and economic weight',
    rankLabel: 'Economic Surface',
    silhouette: 'square',
    hierarchyDepth: 2,
  },
  knowledge: {
    motif: 'Archive tabs',
    shape: 'archive',
    memoryCue: 'retrieval, evidence, memory, and archive literacy',
    rankLabel: 'Archive Surface',
    silhouette: 'square',
    hierarchyDepth: 2,
  },
  spatial: {
    motif: 'Spatial grid',
    shape: 'grid',
    memoryCue: 'tile fields, scans, layouts, and simulated space',
    rankLabel: 'Spatial Surface',
    silhouette: 'diamond',
    hierarchyDepth: 2,
  },
  control: {
    motif: 'Control screen',
    shape: 'screen',
    memoryCue: 'dashboard framing and interface command',
    rankLabel: 'Interface Surface',
    silhouette: 'square',
    hierarchyDepth: 2,
  },
  architecture: {
    motif: 'Scaffold frame',
    shape: 'frame',
    memoryCue: 'boundaries, engineering discipline, and refactor law',
    rankLabel: 'Architecture Surface',
    silhouette: 'hex',
    hierarchyDepth: 2,
  },
  integration: {
    motif: 'Boundary diamond',
    shape: 'diamond',
    memoryCue: 'gateway contact, exchange seams, and external interface posture',
    rankLabel: 'Boundary Surface',
    silhouette: 'diamond',
    hierarchyDepth: 2,
  },
  origin: {
    motif: 'Compass crosshair',
    shape: 'compass',
    memoryCue: 'axiom, manifesto, and directional origin',
    rankLabel: 'Origin Axis',
    silhouette: 'circle',
    hierarchyDepth: 3,
  },
};

function resolvePalettePersona(key: string): CapsuleVisualPersona {
  return PALETTE_PERSONAS[key] ?? DEFAULT_PERSONA;
}

function resolveHeroMark(key: string): CapsuleVisualHeroMark {
  switch (key) {
    case 'capsuleos-core':
      return 'axis';
    case 'capsuleos-law':
      return 'law';
    case 'capsuleos-gates':
      return 'gates';
    case 'capsuleos-runtime':
    case 'capsuleos-status':
      return 'runtime';
    case 'capsuleos-taxonomy':
      return 'architecture';
    case 'capsuleos-protocol':
      return 'boundary';
    case 'workspace':
      return 'habitat';
    case 'assistant':
      return 'assistant';
    case 'planning':
      return 'planning';
    case 'tracker':
      return 'tracker';
    case 'a2c':
      return 'refinery';
    case 'symphony':
      return 'orchestration';
    case 'n-infinity':
      return 'swarm';
    case 'deepmine':
      return 'excavation';
    case 'n1hub':
      return 'world';
    case 'graph-maintenance':
    case 'architecture':
      return 'architecture';
    case 'key-agents':
    case 'control':
      return 'interface';
    case 'night-shift':
    case 'runtime':
      return 'runtime';
    case 'governance':
      return 'governance';
    case 'identity':
      return 'identity';
    case 'economics':
      return 'economics';
    case 'knowledge':
      return 'archive';
    case 'spatial':
      return 'spatial';
    case 'integration':
      return 'boundary';
    case 'origin':
      return 'origin';
    default:
      return 'neutral';
  }
}

const RAW_VISUAL_MEMORY_LEGEND: Omit<
  CapsuleVisualLegendItem,
  'motif' | 'shape' | 'memoryCue' | 'rankLabel' | 'silhouette' | 'heroMark' | 'hierarchyDepth'
>[] = [
  {
    key: 'capsuleos-core',
    label: 'CapsuleOS Core',
    tone: 'Brass Gold',
    sigil: 'OS',
    accent: '#d8b35a',
    description: 'Warm sovereign gold for the live operating spine.',
  },
  {
    key: 'capsuleos-law',
    label: 'CapsuleOS Law',
    tone: 'Archive Gold',
    sigil: 'LW',
    accent: '#e0c57a',
    description: 'Archive gold for law, admission rules, and constitutional structure.',
  },
  {
    key: 'capsuleos-gates',
    label: 'Validation Gates',
    tone: 'Ember',
    sigil: 'GT',
    accent: '#d87a5f',
    description: 'Ember for validator pressure, gates, and trust boundaries.',
  },
  {
    key: 'capsuleos-runtime',
    label: 'CapsuleOS Runtime',
    tone: 'Sea Teal',
    sigil: 'RT',
    accent: '#5cb6a8',
    description: 'Sea teal for runtime substrate, stewardship, and system motion.',
  },
  {
    key: 'capsuleos-status',
    label: 'CapsuleOS Status',
    tone: 'Moss',
    sigil: 'ST',
    accent: '#73bf8d',
    description: 'Moss for lifecycle states and status-oriented doctrine.',
  },
  {
    key: 'capsuleos-taxonomy',
    label: 'CapsuleOS Taxonomy',
    tone: 'Iris',
    sigil: 'TX',
    accent: '#8f90dd',
    description: 'Iris for types, subtypes, relation classes, and taxonomy.',
  },
  {
    key: 'capsuleos-protocol',
    label: 'CapsuleOS Protocol',
    tone: 'Azure',
    sigil: 'PX',
    accent: '#67a8d7',
    description: 'Azure for hashes, vectors, and protocol mechanics.',
  },
  {
    key: 'workspace',
    label: 'Workspace',
    tone: 'Grove Green',
    sigil: 'WS',
    accent: '#79bf84',
    description: 'Grove green for the operator desk and visible control surfaces.',
  },
  {
    key: 'assistant',
    label: 'Assistant',
    tone: 'Cobalt',
    sigil: 'AI',
    accent: '#7aa5e2',
    description: 'Cobalt for conversation, agency, and operator-facing intelligence.',
  },
  {
    key: 'planning',
    label: 'Planning',
    tone: 'Olive',
    sigil: 'PL',
    accent: '#9fc86d',
    description: 'Olive for goals, tasks, roadmap, and horizon shaping.',
  },
  {
    key: 'tracker',
    label: 'Tracker',
    tone: 'Harbor Teal',
    sigil: 'TR',
    accent: '#5eaec9',
    description: 'Harbor teal for signals, pressure, and tracked objects.',
  },
  {
    key: 'a2c',
    label: 'A2C',
    tone: 'Cyan',
    sigil: 'A2',
    accent: '#5fc5d8',
    description: 'Cyan for ingest, synthesis, admission, and candidate flow.',
  },
  {
    key: 'symphony',
    label: 'Symphony',
    tone: 'Orchid',
    sigil: 'SY',
    accent: '#b28de7',
    description: 'Orchid for assignment flow, session fabric, and orchestration.',
  },
  {
    key: 'n-infinity',
    label: 'N-Infinity',
    tone: 'Rose',
    sigil: 'NI',
    accent: '#cf7cb9',
    description: 'Rose for swarm fabric, review intelligence, and bounded synthesis.',
  },
  {
    key: 'deepmine',
    label: 'DeepMine',
    tone: 'Copper',
    sigil: 'DM',
    accent: '#d48b57',
    description: 'Copper for mining lanes, excavation, and signal extraction.',
  },
  {
    key: 'n1hub',
    label: 'N1Hub Habitat',
    tone: 'Royal Indigo',
    sigil: 'NH',
    accent: '#7c8fe3',
    description: 'Royal indigo for the habitat runtime, doctrinal seams, and operator world.',
  },
  {
    key: 'graph-maintenance',
    label: 'Graph Maintenance',
    tone: 'Viridian',
    sigil: 'CG',
    accent: '#62c4a1',
    description: 'Viridian for topology pressure, arbitration, upkeep, and graph evolution.',
  },
  {
    key: 'key-agents',
    label: 'Key Agents',
    tone: 'Lane Violet',
    sigil: 'KA',
    accent: '#9a8de0',
    description: 'Lane violet for role topology, lane ownership, and live agent map reading.',
  },
  {
    key: 'night-shift',
    label: 'Night Shift',
    tone: 'Moon Blue',
    sigil: 'NS',
    accent: '#7aa7d8',
    description: 'Moon blue for autonomy windows, sleep-time compute, and day-night handoff.',
  },
  {
    key: 'runtime',
    label: 'Runtime',
    tone: 'Lagoon',
    sigil: 'BG',
    accent: '#58b2a1',
    description: 'Lagoon for background execution, stewardship, and autonomous maintenance.',
  },
  {
    key: 'governance',
    label: 'Governance',
    tone: 'Mulberry',
    sigil: 'GV',
    accent: '#c7727d',
    description: 'Mulberry for review, policy, trust, and operator governance.',
  },
  {
    key: 'identity',
    label: 'Identity',
    tone: 'Steel Blue',
    sigil: 'ID',
    accent: '#7e98c8',
    description: 'Steel blue for profile, role, access, and personal surfaces.',
  },
  {
    key: 'economics',
    label: 'Economics',
    tone: 'Saffron',
    sigil: 'EC',
    accent: '#d7a95d',
    description: 'Saffron for wallet, supply, tokenomics, and economic posture.',
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    tone: 'Sea Glass',
    sigil: 'KN',
    accent: '#78c2ba',
    description: 'Sea glass for archive, memory, retrieval, evidence, and metrics.',
  },
  {
    key: 'spatial',
    label: 'Spatial',
    tone: 'Ceramic Aqua',
    sigil: 'SP',
    accent: '#75b9c6',
    description: 'Ceramic aqua for tiles, scanning, spatial layout, and simulation.',
  },
  {
    key: 'control',
    label: 'Control Surface',
    tone: 'Periwinkle',
    sigil: 'UI',
    accent: '#8899e1',
    description: 'Periwinkle for dashboards, operator surfaces, and interface control.',
  },
  {
    key: 'architecture',
    label: 'Architecture',
    tone: 'Stone Sage',
    sigil: 'AR',
    accent: '#8ea97a',
    description: 'Stone sage for engineering doctrine, boundaries, and refactor structure.',
  },
  {
    key: 'integration',
    label: 'Integration Boundary',
    tone: 'Tide Blue',
    sigil: 'IX',
    accent: '#6b8ecf',
    description: 'Tide blue for gateways, external interfaces, and exchange seams.',
  },
  {
    key: 'origin',
    label: 'Origin Core',
    tone: 'Bone',
    sigil: 'OR',
    accent: '#d7ccb0',
    description: 'Bone for constitutional origin, compass, and foundational axioms.',
  },
];

export const CAPSULE_VISUAL_MEMORY_LEGEND: CapsuleVisualLegendItem[] =
  RAW_VISUAL_MEMORY_LEGEND.map((item) => ({
    ...item,
    ...resolvePalettePersona(item.key),
    heroMark: resolveHeroMark(item.key),
  }));

function clampAlpha(alpha: number) {
  if (!Number.isFinite(alpha)) return 1;
  return Math.min(1, Math.max(0, alpha));
}

export function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const safeAlpha = clampAlpha(alpha);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}

function isValidationGateCapsule(capsuleId: string) {
  return (
    capsuleId.startsWith('capsule.foundation.capsuleos.16-gates') ||
    /^capsule\.foundation\.g(?:0[1-9]|1[0-6])\.v1$/.test(capsuleId)
  );
}

function resolveFoundationPaletteKey(capsuleId: string) {
  if (isValidationGateCapsule(capsuleId)) {
    return 'capsuleos-gates';
  }

  if (capsuleId === 'capsule.foundation.capsuleos.v1') {
    return 'capsuleos-core';
  }

  if (
    capsuleId === 'capsule.foundation.capsuleos-schema.v1' ||
    capsuleId === 'capsule.foundation.capsuleos-spec.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.5-element-law.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.law-surfaces.v1'
  ) {
    return 'capsuleos-law';
  }

  if (
    capsuleId === 'capsule.foundation.capsuleos.admission-lifecycle.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.runtime-substrate.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.stewardship-interfaces.v1'
  ) {
    return 'capsuleos-runtime';
  }

  if (
    capsuleId.startsWith('capsule.foundation.capsuleos.status-')
  ) {
    return 'capsuleos-status';
  }

  if (
    capsuleId.startsWith('capsule.foundation.capsuleos.type-') ||
    capsuleId.startsWith('capsule.foundation.capsuleos.subtype-') ||
    capsuleId === 'capsule.foundation.capsuleos.relation-types.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.capsule-concept.v1'
  ) {
    return 'capsuleos-taxonomy';
  }

  if (
    capsuleId === 'capsule.foundation.capsuleos.semantic-hash.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.confidence-vector.v1' ||
    capsuleId === 'capsule.foundation.capsuleos.versioning-protocol.v1'
  ) {
    return 'capsuleos-protocol';
  }

  if (capsuleId.startsWith('capsule.foundation.capsuleos.')) {
    return 'capsuleos-core';
  }

  if (capsuleId.startsWith('capsule.foundation.a2c')) {
    return 'a2c';
  }

  if (capsuleId.startsWith('capsule.foundation.capsule-generation-protocol')) {
    return 'a2c';
  }

  if (
    capsuleId.startsWith('capsule.foundation.symphony') ||
    capsuleId.startsWith('capsule.project.symphony')
  ) {
    return 'symphony';
  }

  if (
    capsuleId.startsWith('capsule.foundation.n1hub') ||
    capsuleId === 'capsule.project.n1hub-v0.v1'
  ) {
    return 'n1hub';
  }

  if (
    capsuleId.startsWith('capsule.foundation.n-infinity') ||
    capsuleId.startsWith('capsule.project.n-infinity')
  ) {
    return 'n-infinity';
  }

  if (
    capsuleId.startsWith('capsule.foundation.workspace') ||
    capsuleId.startsWith('capsule.project.workspace')
  ) {
    return 'workspace';
  }

  if (capsuleId.startsWith('capsule.foundation.tracker')) {
    return 'tracker';
  }

  if (
    capsuleId.startsWith('capsule.foundation.roadmap') ||
    capsuleId.startsWith('capsule.foundation.goal') ||
    capsuleId.startsWith('capsule.foundation.milestone') ||
    capsuleId.startsWith('capsule.foundation.task') ||
    capsuleId.startsWith('capsule.foundation.planner') ||
    capsuleId.startsWith('capsule.foundation.planning-horizon-engine') ||
    capsuleId.startsWith('capsule.foundation.daily-planner-agent') ||
    capsuleId === 'capsule.foundation.project.v1'
  ) {
    return 'planning';
  }

  if (
    capsuleId.startsWith('capsule.foundation.calendar') ||
    capsuleId.startsWith('capsule.foundation.notification') ||
    capsuleId.startsWith('capsule.foundation.reminder')
  ) {
    return 'tracker';
  }

  if (
    capsuleId.startsWith('capsule.foundation.personal-ai-assistant') ||
    capsuleId.startsWith('capsule.foundation.chat-to-capsules') ||
    capsuleId.startsWith('capsule.foundation.agent-') ||
    capsuleId.startsWith('capsule.ai.')
  ) {
    return 'assistant';
  }

  if (
    capsuleId.startsWith('capsule.foundation.deepmine') ||
    capsuleId.startsWith('capsule.project.deepmine')
  ) {
    return 'deepmine';
  }

  if (capsuleId.startsWith('capsule.foundation.key-agents')) {
    return 'key-agents';
  }

  if (
    capsuleId.startsWith('capsule.foundation.capsule-graph-maintenance') ||
    capsuleId.startsWith('capsule.foundation.capsule-graph-refactor-agent') ||
    capsuleId.startsWith('capsule.foundation.capsule-markup-agent') ||
    capsuleId.startsWith('capsule.foundation.capsule-decomposition-agent') ||
    capsuleId.startsWith('capsule.foundation.capsule-job') ||
    capsuleId.startsWith('capsule.foundation.hub-atomic')
  ) {
    return 'graph-maintenance';
  }

  if (
    capsuleId.startsWith('capsule.foundation.night-shift-autonomy') ||
    capsuleId.startsWith('capsule.foundation.sleep-time-compute')
  ) {
    return 'night-shift';
  }

  if (
    capsuleId.startsWith('capsule.foundation.ai-wallet') ||
    capsuleId.startsWith('capsule.foundation.ai-economics') ||
    capsuleId.startsWith('capsule.foundation.n1-pass') ||
    capsuleId.startsWith('capsule.foundation.n1-coin-tokenomics') ||
    capsuleId.startsWith('capsule.foundation.boost') ||
    capsuleId.startsWith('capsule.foundation.marketplace') ||
    capsuleId.startsWith('capsule.foundation.hybrid-llm-access')
  ) {
    return 'economics';
  }

  if (
    capsuleId.startsWith('capsule.foundation.profile') ||
    capsuleId.startsWith('capsule.foundation.user-preferences') ||
    capsuleId.startsWith('capsule.foundation.role') ||
    capsuleId.startsWith('capsule.foundation.team') ||
    capsuleId.startsWith('capsule.foundation.invitation') ||
    capsuleId.startsWith('capsule.foundation.permission') ||
    capsuleId.startsWith('capsule.foundation.access-models')
  ) {
    return 'identity';
  }

  if (
    capsuleId.startsWith('capsule.foundation.security') ||
    capsuleId.startsWith('capsule.foundation.audit-log') ||
    capsuleId.startsWith('capsule.foundation.architect-override') ||
    capsuleId.startsWith('capsule.foundation.branch-steward-agent') ||
    capsuleId.startsWith('capsule.foundation.review-agent') ||
    capsuleId.startsWith('capsule.foundation.validation-gatekeeper-agent') ||
    capsuleId.startsWith('capsule.foundation.quarantine-buffer') ||
    capsuleId.startsWith('capsule.foundation.n-infinity.parliament')
  ) {
    return 'governance';
  }

  if (
    capsuleId.startsWith('capsule.foundation.archive') ||
    capsuleId.startsWith('capsule.foundation.analytics') ||
    capsuleId.startsWith('capsule.foundation.metric') ||
    capsuleId.startsWith('capsule.foundation.epistemic-ledger') ||
    capsuleId.startsWith('capsule.foundation.capsule-librarian-agent')
  ) {
    return 'knowledge';
  }

  if (
    capsuleId.startsWith('capsule.foundation.dashboard') ||
    capsuleId.startsWith('capsule.foundation.ai-control-surface') ||
    capsuleId.startsWith('capsule.foundation.graph-3d-visualization')
  ) {
    return 'control';
  }

  if (
    capsuleId.startsWith('capsule.foundation.api-gateway') ||
    capsuleId.startsWith('capsule.foundation.integrations') ||
    capsuleId.startsWith('capsule.foundation.hybrid-database')
  ) {
    return 'integration';
  }

  if (
    capsuleId.startsWith('capsule.foundation.ai-friendly-engineering') ||
    capsuleId.startsWith('capsule.foundation.contract-governed-boundaries') ||
    capsuleId.startsWith('capsule.foundation.domain-capsule-boundaries') ||
    capsuleId.startsWith('capsule.foundation.low-blast-radius-architecture') ||
    capsuleId.startsWith('capsule.foundation.golden-path-engineering') ||
    capsuleId.startsWith('capsule.foundation.sovereign-refactor') ||
    capsuleId.startsWith('capsule.foundation.sovereign-template') ||
    capsuleId.startsWith('capsule.foundation.testing')
  ) {
    return 'architecture';
  }

  if (
    capsuleId === 'capsule.foundation.to-dig-deep.v1' ||
    capsuleId === 'capsule.foundation.between-zero-and-one.v1' ||
    capsuleId === 'capsule.foundation.sovereign-intellectual-capital.v1' ||
    capsuleId === 'capsule.foundation.human-ai-symbiosis.v1' ||
    capsuleId === 'capsule.foundation.n1hub-gold-master.v1' ||
    capsuleId === 'capsule.foundation.ignition-ritual.v1'
  ) {
    return 'origin';
  }

  if (
    capsuleId.startsWith('capsule.foundation.tilesims') ||
    capsuleId.startsWith('capsule.foundation.blockchain-opensource')
  ) {
    return 'spatial';
  }

  if (
    capsuleId.startsWith('capsule.foundation.background-agent-runtime') ||
    capsuleId.startsWith('capsule.foundation.vault-stewardship-swarm') ||
    capsuleId.startsWith('capsule.operations.vault-steward') ||
    capsuleId.startsWith('capsule.foundation.vault-update-agent')
  ) {
    return 'runtime';
  }

  if (
    capsuleId.startsWith('capsule.foundation.deep-intake-investigation')
  ) {
    return 'deepmine';
  }

  if (
    capsuleId.startsWith('capsule.foundation.royalty-engine')
  ) {
    return 'economics';
  }

  if (
    capsuleId.startsWith('capsule.foundation.siaf-governance')
  ) {
    return 'governance';
  }

  return null;
}

function resolvePaletteSeed(metadata: Pick<CapsuleMetadata, 'capsule_id' | 'type'>) {
  const capsuleId = metadata.capsule_id;
  const familyKey =
    metadata.type === 'foundation'
      ? resolveFoundationPaletteKey(capsuleId)
      : null;

  if (familyKey) {
    return {
      key: familyKey,
      seed: PALETTE_SEEDS[familyKey],
    };
  }

  if (capsuleId.startsWith('capsule.project.symphony')) {
    return { key: 'symphony', seed: PALETTE_SEEDS.symphony };
  }

  if (capsuleId.startsWith('capsule.project.workspace')) {
    return { key: 'workspace', seed: PALETTE_SEEDS.workspace };
  }

  if (capsuleId.startsWith('capsule.project.deepmine')) {
    return { key: 'deepmine', seed: PALETTE_SEEDS.deepmine };
  }

  if (capsuleId.startsWith('capsule.project.n-infinity')) {
    return { key: 'n-infinity', seed: PALETTE_SEEDS['n-infinity'] };
  }

  if (capsuleId.startsWith('capsule.project.a2c')) {
    return { key: 'a2c', seed: PALETTE_SEEDS.a2c };
  }

  if (capsuleId.startsWith('capsule.operations.vault-steward')) {
    return { key: 'runtime', seed: PALETTE_SEEDS.runtime };
  }

  if (
    capsuleId.startsWith('capsule.project.capsuleos')
  ) {
    return { key: 'capsuleos-core', seed: PALETTE_SEEDS['capsuleos-core'] };
  }

  if (
    capsuleId.startsWith('capsule.project.n1hub-v0')
  ) {
    return { key: 'n1hub', seed: PALETTE_SEEDS.n1hub };
  }

  if (
    capsuleId.startsWith('capsule.project.n1hub-sovereign-refactor')
  ) {
    return { key: 'architecture', seed: PALETTE_SEEDS.architecture };
  }

  if (
    capsuleId.startsWith('capsule.project.from-zero-to-megabytes') ||
    capsuleId.startsWith('capsule.project.restart-challenge')
  ) {
    return { key: 'origin', seed: PALETTE_SEEDS.origin };
  }

  if (
    capsuleId.startsWith('capsule.project.tilesims') ||
    capsuleId.startsWith('capsule.project.apsnytravel') ||
    capsuleId.startsWith('capsule.project.mining-company') ||
    capsuleId.startsWith('capsule.concept.generative-ai-tile') ||
    capsuleId.startsWith('capsule.concept.lidar-scanning') ||
    capsuleId.startsWith('capsule.concept.tile-layout-algorithm')
  ) {
    return { key: 'spatial', seed: PALETTE_SEEDS.spatial };
  }

  if (
    capsuleId.startsWith('capsule.ai.') ||
    capsuleId.startsWith('capsule.integration.notification') ||
    capsuleId.startsWith('capsule.integration.calendar')
  ) {
    return { key: 'assistant', seed: PALETTE_SEEDS.assistant };
  }

  if (capsuleId.startsWith('capsule.dashboard.')) {
    return { key: 'control', seed: PALETTE_SEEDS.control };
  }

  if (capsuleId.startsWith('capsule.access.') || capsuleId.startsWith('capsule.person.')) {
    return { key: 'identity', seed: PALETTE_SEEDS.identity };
  }

  if (capsuleId.startsWith('capsule.core.')) {
    return { key: 'origin', seed: PALETTE_SEEDS.origin };
  }

  if (metadata.type && TYPE_DEFAULTS[metadata.type]) {
    return {
      key: metadata.type,
      seed: TYPE_DEFAULTS[metadata.type],
    };
  }

  return {
    key: 'unknown',
    seed: UNKNOWN_PALETTE,
  };
}

export function resolveCapsulePalette(
  metadata: Pick<CapsuleMetadata, 'capsule_id' | 'type'>,
): CapsuleVisualPalette {
  const resolved = resolvePaletteSeed(metadata);
  const persona = resolvePalettePersona(resolved.key);
  const accent = resolved.seed.accent;

  return {
    key: resolved.key,
    label: resolved.seed.label,
    tone: resolved.seed.tone,
    sigil: resolved.seed.sigil,
    motif: persona.motif,
    shape: persona.shape,
    memoryCue: persona.memoryCue,
    rankLabel: persona.rankLabel,
    silhouette: persona.silhouette,
    heroMark: resolveHeroMark(resolved.key),
    hierarchyDepth: persona.hierarchyDepth,
    accent,
    badgeText: accent,
    badgeBorder: withAlpha(accent, 0.45),
    badgeBackground: withAlpha(accent, 0.14),
    cardBorder: withAlpha(accent, 0.34),
    cardGlow: withAlpha(accent, 0.18),
    accentLine: `linear-gradient(90deg, ${withAlpha(accent, 0)} 0%, ${withAlpha(accent, 0.82)} 20%, ${withAlpha(accent, 1)} 50%, ${withAlpha(accent, 0.82)} 80%, ${withAlpha(accent, 0)} 100%)`,
    graphNode: accent,
  };
}
