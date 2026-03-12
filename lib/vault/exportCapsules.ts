import { logClientAction } from '@/lib/clientActivity';
import type { SovereignCapsule } from '@/types/capsule';

export const ZIP_ARCHIVE_THRESHOLD = 6;
export type ExportBranch = 'real' | 'dream';
type ActiveExportBranch = ExportBranch | 'mixed';

export type ExportCapsuleSelection = {
  capsule: SovereignCapsule;
  branch?: ExportBranch;
  sourceFilename?: string | null;
};

type NormalizedExportSelection = {
  capsule: SovereignCapsule;
  branch: ExportBranch | null;
};

type ExportManifestCapsuleRecord =
  | string
  | {
      capsule_id: string;
      branch: ExportBranch;
    };

type ExportManifestV2 = {
  format: 'n1hub-capsules-zip-v2';
  exported_at: string;
  active_branch: ActiveExportBranch;
  snapshot_locked_at: string;
  count: {
    total: number;
    real: number;
    dream: number;
  };
  root_hubs: string[];
  ssot_ladder: string[];
  dialect_configuration: {
    branch_identity: 'filename-overlay';
    branch_manifest_state: 'external-manifest';
    capsule_shape: 'capsuleos-5-element';
    integrity_seal: 'sha3-512';
  };
  capsules: ExportManifestCapsuleRecord[];
  capsule_ids: string[];
};

export type ExportCapsulesOptions = {
  activeBranch?: ActiveExportBranch;
  snapshotLockedAt?: string;
};

const ROOT_HUB_IDS = [
  'capsule.core.first-spark.v1',
  'capsule.core.constitution.v1',
  'capsule.core.manifesto.v1',
  'capsule.core.compass.v1',
  'capsule.core.atom.v1',
] as const;

const SSOT_LADDER = [
  'capsule.core.constitution.v1',
  'capsule.core.manifesto.v1',
  'capsule.core.compass.v1',
  'capsule.core.first-spark.v1',
  'capsule.core.atom.v1',
  'capsule.foundation.capsuleos.v1',
  'capsule.foundation.capsuleos-spec.v1',
  'capsule.foundation.capsuleos-schema.v1',
] as const;

const DIALECT_CONFIGURATION = {
  branch_identity: 'filename-overlay',
  branch_manifest_state: 'external-manifest',
  capsule_shape: 'capsuleos-5-element',
  integrity_seal: 'sha3-512',
} as const;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function todayStamp() {
  return new Date().toISOString().split('T')[0];
}

function sanitizeCapsuleFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function writeUint16LE(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  crcTable = table;
  return table;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let value = 0xffffffff;

  for (const currentByte of bytes) {
    value = table[(value ^ currentByte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  name: string;
  bytes: Uint8Array;
};

function cloneCapsule(capsule: SovereignCapsule): SovereignCapsule {
  return JSON.parse(JSON.stringify(capsule)) as SovereignCapsule;
}

function isExportCapsuleSelection(
  value: SovereignCapsule | ExportCapsuleSelection,
): value is ExportCapsuleSelection {
  return Boolean(value && typeof value === 'object' && 'capsule' in value);
}

function resolveBranchFromFilename(value: string | null | undefined): ExportBranch | null {
  if (!value) return null;
  if (/@dream\.json$/i.test(value)) return 'dream';
  if (/\.json$/i.test(value) && !/@[a-z0-9._-]+\.json$/i.test(value)) return 'real';
  return null;
}

function normalizeExportSelections(
  items: ReadonlyArray<SovereignCapsule | ExportCapsuleSelection>,
  options: ExportCapsulesOptions = {},
): {
  snapshotLockedAt: string;
  activeBranch: ActiveExportBranch;
  selections: NormalizedExportSelection[];
} {
  const snapshotLockedAt = options.snapshotLockedAt ?? new Date().toISOString();
  const branchHint = options.activeBranch && options.activeBranch !== 'mixed' ? options.activeBranch : null;
  const selections = items.map((item) => {
    if (isExportCapsuleSelection(item)) {
      return {
        capsule: cloneCapsule(item.capsule),
        branch: item.branch ?? resolveBranchFromFilename(item.sourceFilename) ?? branchHint,
      };
    }

    return {
      capsule: cloneCapsule(item),
      branch: branchHint,
    };
  });

  const resolvedBranchSet = new Set<ExportBranch>(selections.flatMap((selection) => (
    selection.branch ? [selection.branch] : []
  )));

  const activeBranch =
    options.activeBranch ??
    (resolvedBranchSet.size === 1 ? [...resolvedBranchSet][0] : 'mixed');

  if (
    activeBranch === 'mixed' &&
    selections.some((selection) => selection.branch == null)
  ) {
    throw new Error('Mixed-branch export requires per-capsule branch metadata.');
  }

  if (activeBranch !== 'mixed') {
    selections.forEach((selection) => {
      if (selection.branch == null) {
        selection.branch = activeBranch;
        return;
      }

      if (selection.branch !== activeBranch) {
        throw new Error('Export branch metadata conflicts with the requested active branch.');
      }
    });
  }

  return {
    snapshotLockedAt,
    activeBranch,
    selections,
  };
}

function requireResolvedBranch(selection: NormalizedExportSelection): ExportBranch {
  if (!selection.branch) {
    throw new Error(`Unable to resolve branch for ${selection.capsule.metadata.capsule_id}.`);
  }
  return selection.branch;
}

function buildManifestV2(
  selections: NormalizedExportSelection[],
  snapshotLockedAt: string,
  activeBranch: ActiveExportBranch,
): ExportManifestV2 {
  const realCount = selections.filter((selection) => requireResolvedBranch(selection) === 'real').length;
  const dreamCount = selections.length - realCount;

  const capsules =
    activeBranch === 'mixed'
      ? selections.map((selection) => ({
          capsule_id: selection.capsule.metadata.capsule_id,
          branch: requireResolvedBranch(selection),
        }))
      : selections.map((selection) => selection.capsule.metadata.capsule_id);

  return {
    format: 'n1hub-capsules-zip-v2',
    exported_at: new Date().toISOString(),
    active_branch: activeBranch,
    snapshot_locked_at: snapshotLockedAt,
    count: {
      total: selections.length,
      real: realCount,
      dream: dreamCount,
    },
    root_hubs: [...ROOT_HUB_IDS],
    ssot_ladder: [...SSOT_LADDER],
    dialect_configuration: { ...DIALECT_CONFIGURATION },
    capsules,
    capsule_ids: selections.map((selection) => selection.capsule.metadata.capsule_id),
  };
}

function buildCapsuleExportFilename(selection: NormalizedExportSelection) {
  const baseName = sanitizeCapsuleFilename(selection.capsule.metadata.capsule_id);
  const branch = selection.branch;

  if (branch === 'dream') {
    return `${baseName}@dream.json`;
  }

  return `${baseName}.json`;
}

function createStoredZipBlob(entries: ZipEntry[]) {
  const toBlobPart = (bytes: Uint8Array): ArrayBuffer => {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  };
  const localRecords: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeText(entry.name);
    const nameLength = nameBytes.length;
    const dataLength = entry.bytes.length;
    const checksum = crc32(entry.bytes);

    const localRecord = new Uint8Array(30 + nameLength + dataLength);
    writeUint32LE(localRecord, 0, 0x04034b50);
    writeUint16LE(localRecord, 4, 20);
    writeUint16LE(localRecord, 6, 0);
    writeUint16LE(localRecord, 8, 0);
    writeUint16LE(localRecord, 10, 0);
    writeUint16LE(localRecord, 12, 0);
    writeUint32LE(localRecord, 14, checksum);
    writeUint32LE(localRecord, 18, dataLength);
    writeUint32LE(localRecord, 22, dataLength);
    writeUint16LE(localRecord, 26, nameLength);
    writeUint16LE(localRecord, 28, 0);
    localRecord.set(nameBytes, 30);
    localRecord.set(entry.bytes, 30 + nameLength);
    localRecords.push(localRecord);

    const centralRecord = new Uint8Array(46 + nameLength);
    writeUint32LE(centralRecord, 0, 0x02014b50);
    writeUint16LE(centralRecord, 4, 20);
    writeUint16LE(centralRecord, 6, 20);
    writeUint16LE(centralRecord, 8, 0);
    writeUint16LE(centralRecord, 10, 0);
    writeUint16LE(centralRecord, 12, 0);
    writeUint16LE(centralRecord, 14, 0);
    writeUint32LE(centralRecord, 16, checksum);
    writeUint32LE(centralRecord, 20, dataLength);
    writeUint32LE(centralRecord, 24, dataLength);
    writeUint16LE(centralRecord, 28, nameLength);
    writeUint16LE(centralRecord, 30, 0);
    writeUint16LE(centralRecord, 32, 0);
    writeUint16LE(centralRecord, 34, 0);
    writeUint16LE(centralRecord, 36, 0);
    writeUint32LE(centralRecord, 38, 0);
    writeUint32LE(centralRecord, 42, offset);
    centralRecord.set(nameBytes, 46);
    centralRecords.push(centralRecord);

    offset += localRecord.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralRecords.reduce((sum, record) => sum + record.length, 0);
  const endOfCentralDirectory = new Uint8Array(22);
  writeUint32LE(endOfCentralDirectory, 0, 0x06054b50);
  writeUint16LE(endOfCentralDirectory, 4, 0);
  writeUint16LE(endOfCentralDirectory, 6, 0);
  writeUint16LE(endOfCentralDirectory, 8, entries.length);
  writeUint16LE(endOfCentralDirectory, 10, entries.length);
  writeUint32LE(endOfCentralDirectory, 12, centralDirectorySize);
  writeUint32LE(endOfCentralDirectory, 16, centralDirectoryOffset);
  writeUint16LE(endOfCentralDirectory, 20, 0);

  return new Blob(
    [
      ...localRecords.map(toBlobPart),
      ...centralRecords.map(toBlobPart),
      toBlobPart(endOfCentralDirectory),
    ],
    {
      type: 'application/zip',
    },
  );
}

function uniqueArchiveFilename(baseName: string, usedNames: Set<string>) {
  let candidate = baseName;
  let counter = 2;

  while (usedNames.has(candidate)) {
    candidate = `${baseName.replace(/\.json$/, '')}_${counter}.json`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function buildArchiveEntries(
  selections: NormalizedExportSelection[],
  snapshotLockedAt: string,
  activeBranch: ActiveExportBranch,
) {
  const usedNames = new Set<string>();
  const manifest = buildManifestV2(selections, snapshotLockedAt, activeBranch);
  const entries: ZipEntry[] = [
    {
      name: 'manifest.json',
      bytes: encodeText(JSON.stringify(manifest, null, 2)),
    },
  ];

  for (const selection of selections) {
    const filename = uniqueArchiveFilename(buildCapsuleExportFilename(selection), usedNames);
    entries.push({
      name: `capsules/${filename}`,
      bytes: encodeText(JSON.stringify(selection.capsule, null, 2)),
    });
  }

  return entries;
}

export async function exportCapsulesToDisk(
  items: ReadonlyArray<SovereignCapsule | ExportCapsuleSelection>,
  options: ExportCapsulesOptions = {},
) {
  if (items.length === 0) {
    return;
  }

  const { snapshotLockedAt, activeBranch, selections } = normalizeExportSelections(items, options);
  const isSingleCapsule = selections.length === 1;
  const data = isSingleCapsule
    ? selections[0].capsule
    : {
        manifest: buildManifestV2(selections, snapshotLockedAt, activeBranch),
        capsules: selections.map((selection) => selection.capsule),
      };
  const filename = isSingleCapsule
    ? buildCapsuleExportFilename(selections[0])
    : `n1hub_capsules_bundle_${todayStamp()}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  triggerDownload(blob, filename);

  await logClientAction('export', {
    message: isSingleCapsule
      ? 'Capsule exported to local disk.'
      : 'Capsules exported to local disk as one bundle.',
    mode: isSingleCapsule ? 'single-file' : 'bundle',
    activeBranch,
    snapshotLockedAt,
    capsuleIds: selections.map((selection) => selection.capsule.metadata.capsule_id),
    count: selections.length,
  });
}

export async function exportCapsulesAsSeparateFiles(
  items: ReadonlyArray<SovereignCapsule | ExportCapsuleSelection>,
  options: ExportCapsulesOptions = {},
) {
  if (items.length === 0) {
    return;
  }

  const { snapshotLockedAt, activeBranch, selections } = normalizeExportSelections(items, options);

  if (selections.length >= ZIP_ARCHIVE_THRESHOLD) {
    const archiveBlob = createStoredZipBlob(buildArchiveEntries(selections, snapshotLockedAt, activeBranch));
    triggerDownload(archiveBlob, `n1hub_capsules_archive_${todayStamp()}.zip`);

    await logClientAction('export', {
      message: 'Capsules exported to local disk as a ZIP archive.',
      mode: 'zip-archive',
      activeBranch,
      snapshotLockedAt,
      capsuleIds: selections.map((selection) => selection.capsule.metadata.capsule_id),
      count: selections.length,
    });
    return;
  }

  for (const selection of selections) {
    const blob = new Blob([JSON.stringify(selection.capsule, null, 2)], { type: 'application/json' });
    triggerDownload(blob, buildCapsuleExportFilename(selection));
  }

  await logClientAction('export', {
    message: 'Capsules exported to local disk as separate files.',
    mode: 'separate-files',
    activeBranch,
    snapshotLockedAt,
    capsuleIds: selections.map((selection) => selection.capsule.metadata.capsule_id),
    count: selections.length,
  });
}
