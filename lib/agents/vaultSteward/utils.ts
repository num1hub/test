import type { VaultStewardConfig } from './schemas';

export function nowIso(): string {
  return new Date().toISOString();
}

export function extractRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function uniqueBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function getDateParts(date: Date, timeZone: string | null): { year: string; month: string; day: string; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone ?? undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: Number.parseInt(lookup('hour'), 10),
  };
}

export function isWithinWindow(config: VaultStewardConfig, now = new Date()): boolean {
  if (config.mode === 'continuous') return true;
  const parts = getDateParts(now, config.timezone);
  if (config.night_start_hour === config.night_end_hour) return true;
  if (config.night_start_hour < config.night_end_hour) {
    return parts.hour >= config.night_start_hour && parts.hour < config.night_end_hour;
  }
  return parts.hour >= config.night_start_hour || parts.hour < config.night_end_hour;
}
