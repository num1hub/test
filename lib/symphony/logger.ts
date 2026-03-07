import type { Logger, LoggingFields, LogLevel } from './types';

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

export class StructuredLogger implements Logger {
  log(level: LogLevel, message: string, fields: LoggingFields = {}): void {
    const timestamp = new Date().toISOString();
    const renderedFields = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join(' ');
    const suffix = renderedFields ? ` ${renderedFields}` : '';
    process.stderr.write(`${timestamp} level=${level} message=${formatValue(message)}${suffix}\n`);
  }

  debug(message: string, fields?: LoggingFields): void {
    this.log('debug', message, fields);
  }

  info(message: string, fields?: LoggingFields): void {
    this.log('info', message, fields);
  }

  warn(message: string, fields?: LoggingFields): void {
    this.log('warn', message, fields);
  }

  error(message: string, fields?: LoggingFields): void {
    this.log('error', message, fields);
  }
}
