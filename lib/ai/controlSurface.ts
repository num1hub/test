const DEFAULT_LANES = [
  {
    id: 'symphony',
    label: 'Symphony',
    origin:
      process.env.N1HUB_SYMPHONY_STATUS_ORIGIN?.trim() || 'http://127.0.0.1:4310',
  },
  {
    id: 'ninfinity',
    label: 'N-Infinity',
    origin:
      process.env.N1HUB_NINFINITY_STATUS_ORIGIN?.trim() || 'http://127.0.0.1:4311',
  },
] as const;

export type AiLaneId = (typeof DEFAULT_LANES)[number]['id'];

export interface AiLaneSnapshot {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  codex_totals?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    seconds_running?: number;
  } | null;
  rate_limits?: unknown;
}

export interface AiLaneStatus {
  id: AiLaneId;
  label: string;
  origin: string;
  state_url: string;
  refresh_url: string;
  status: 'online' | 'offline';
  snapshot: AiLaneSnapshot | null;
  error: string | null;
}

export interface AiLaneRefreshResult {
  id: AiLaneId;
  label: string;
  ok: boolean;
  origin: string;
  response: unknown;
  error: string | null;
}

function withTimeout(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

function isLaneSnapshot(value: unknown): value is AiLaneSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.generated_at !== 'string') return false;
  const counts = record.counts;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) return false;
  const countsRecord = counts as Record<string, unknown>;
  return typeof countsRecord.running === 'number' && typeof countsRecord.retrying === 'number';
}

export function getAiLaneConfigs(): Array<{ id: AiLaneId; label: string; origin: string }> {
  return [...DEFAULT_LANES];
}

export async function fetchAiLaneStatuses(): Promise<AiLaneStatus[]> {
  const lanes = getAiLaneConfigs();

  return Promise.all(
    lanes.map(async (lane) => {
      const stateUrl = `${lane.origin}/api/v1/state`;
      const refreshUrl = `${lane.origin}/api/v1/refresh`;

      try {
        const response = await fetch(stateUrl, {
          method: 'GET',
          signal: withTimeout(2500),
          cache: 'no-store',
        });
        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          return {
            ...lane,
            state_url: stateUrl,
            refresh_url: refreshUrl,
            status: 'offline' as const,
            snapshot: null,
            error: `status ${response.status}`,
          };
        }

        if (!isLaneSnapshot(payload)) {
          return {
            ...lane,
            state_url: stateUrl,
            refresh_url: refreshUrl,
            status: 'offline' as const,
            snapshot: null,
            error: 'invalid snapshot payload',
          };
        }

        return {
          ...lane,
          state_url: stateUrl,
          refresh_url: refreshUrl,
          status: 'online' as const,
          snapshot: payload,
          error: null,
        };
      } catch (error: unknown) {
        return {
          ...lane,
          state_url: stateUrl,
          refresh_url: refreshUrl,
          status: 'offline' as const,
          snapshot: null,
          error: error instanceof Error ? error.message : 'unavailable',
        };
      }
    }),
  );
}

export async function refreshAiLanes(target: AiLaneId | 'all' = 'all'): Promise<AiLaneRefreshResult[]> {
  const lanes = getAiLaneConfigs().filter((lane) => target === 'all' || lane.id === target);

  return Promise.all(
    lanes.map(async (lane) => {
      const refreshUrl = `${lane.origin}/api/v1/refresh`;
      try {
        const response = await fetch(refreshUrl, {
          method: 'POST',
          signal: withTimeout(2500),
        });
        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          return {
            id: lane.id,
            label: lane.label,
            ok: false,
            origin: lane.origin,
            response: payload,
            error: `status ${response.status}`,
          };
        }

        return {
          id: lane.id,
          label: lane.label,
          ok: true,
          origin: lane.origin,
          response: payload,
          error: null,
        };
      } catch (error: unknown) {
        return {
          id: lane.id,
          label: lane.label,
          ok: false,
          origin: lane.origin,
          response: null,
          error: error instanceof Error ? error.message : 'refresh failed',
        };
      }
    }),
  );
}
