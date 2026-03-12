import type { CapsuleMetadata } from '@/types/capsule';

export type CapsuleFaceGlyph = 'dot' | 'diamond' | 'square' | 'triangle';

export type CapsuleFacePoint = {
  x: number;
  y: number;
  r: number;
  opacity: number;
};

export type CapsuleFaceprint = {
  seed: number;
  memoryTag: string;
  glyph: CapsuleFaceGlyph;
  ringCount: 1 | 2 | 3;
  bandMask: readonly [boolean, boolean, boolean];
  tiltDeg: number;
  constellation: readonly CapsuleFacePoint[];
};

const FACE_GLYPHS: readonly CapsuleFaceGlyph[] = ['dot', 'diamond', 'square', 'triangle'];
const CAPSULE_ID_STOP_WORDS = new Set([
  'capsule',
  'foundation',
  'concept',
  'operations',
  'project',
  'person',
  'integration',
  'access',
  'physical',
  'object',
  'dream',
  'real',
]);

function hashString(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenizeCapsuleId(capsuleId: string) {
  return capsuleId
    .replace('@dream', '')
    .split(/[.\-_/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getMeaningfulTokens(capsuleId: string) {
  const tokens = tokenizeCapsuleId(capsuleId).filter((token) => {
    const lowered = token.toLowerCase();
    return !CAPSULE_ID_STOP_WORDS.has(lowered) && !/^v\d+$/i.test(lowered);
  });

  return tokens.length > 0 ? tokens : tokenizeCapsuleId(capsuleId);
}

function tokenCode(token: string) {
  const cleaned = token.replace(/[^a-z0-9]/gi, '');
  if (!cleaned) return 'X';
  if (cleaned.length <= 3) return cleaned.toUpperCase();
  if (/^\d+$/.test(cleaned)) return cleaned.slice(0, 2).toUpperCase();
  if (/^[a-z]\d[a-z0-9]*$/i.test(cleaned)) return cleaned.slice(0, 3).toUpperCase();
  return cleaned[0].toUpperCase();
}

function buildMemoryTag(capsuleId: string, seed: number) {
  const meaningfulTokens = getMeaningfulTokens(capsuleId);
  const tail = meaningfulTokens.slice(-3);

  if (tail.length === 0) {
    return `C${String(seed % 100).padStart(2, '0')}`;
  }

  if (tail.length === 1) {
    const single = tail[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
    return (single || 'CAP').slice(0, 3).padEnd(3, String(seed % 10));
  }

  const last = tail[tail.length - 1];
  const previous = tail[tail.length - 2];

  if (/^\d+$/.test(previous)) {
    return `${previous.slice(0, 2).toUpperCase()}${tokenCode(last)[0]}`.slice(0, 3);
  }

  if (/^\d+$/.test(last)) {
    return `${last.slice(0, 2).toUpperCase()}${tokenCode(previous)[0]}`.slice(0, 3);
  }

  const initials = tail.map((token) => tokenCode(token)[0]).join('').toUpperCase();
  if (initials.length >= 3) {
    return initials.slice(0, 3);
  }

  const joined = tail.map((token) => tokenCode(token)).join('').toUpperCase();
  return joined.slice(0, 3).padEnd(3, String(seed % 10));
}

function buildBandMask(rng: () => number): readonly [boolean, boolean, boolean] {
  const mask: [boolean, boolean, boolean] = [
    rng() > 0.34,
    rng() > 0.5,
    rng() > 0.68,
  ];

  if (!mask[0] && !mask[1] && !mask[2]) {
    mask[1] = true;
  }

  return mask;
}

function buildConstellation(rng: () => number, tiltDeg: number) {
  const pointCount = 3 + Math.floor(rng() * 2);
  const tiltRad = (tiltDeg * Math.PI) / 180;
  const points: CapsuleFacePoint[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const angle = tiltRad + ((Math.PI * 2) / pointCount) * index + rng() * 0.42;
    const radius = 0.22 + rng() * 0.38;
    points.push({
      x: Number((Math.cos(angle) * radius).toFixed(3)),
      y: Number((Math.sin(angle) * radius).toFixed(3)),
      r: Number((0.06 + rng() * 0.07).toFixed(3)),
      opacity: Number((0.44 + rng() * 0.34).toFixed(3)),
    });
  }

  return points;
}

export function resolveCapsuleFaceprint(
  metadata: Pick<CapsuleMetadata, 'capsule_id'> | string,
): CapsuleFaceprint {
  const capsuleId = typeof metadata === 'string' ? metadata : metadata.capsule_id;
  const seed = hashString(capsuleId);
  const rng = createRng(seed);
  const ringCount = (1 + Math.floor(rng() * 3)) as 1 | 2 | 3;
  const glyph = FACE_GLYPHS[Math.floor(rng() * FACE_GLYPHS.length)] ?? 'dot';
  const tiltDeg = Math.floor(rng() * 360);

  return {
    seed,
    memoryTag: buildMemoryTag(capsuleId, seed),
    glyph,
    ringCount,
    bandMask: buildBandMask(rng),
    tiltDeg,
    constellation: buildConstellation(rng, tiltDeg),
  };
}
