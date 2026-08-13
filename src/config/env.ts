export type TransportType = 'stdio' | 'http';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  readonly PORT: number;
  readonly NODE_ENV: string;
  readonly LOG_LEVEL: LogLevel;
  readonly TRANSPORT: TransportType;
  readonly SERVER_NAME: string;
  readonly SERVER_VERSION: string;
  /** Base URL the export server fetches Highcharts scripts from (default: official CDN). */
  readonly HIGHCHARTS_CDN_URL: string | undefined;
  /** Directory the export server caches fetched Highcharts scripts in (default: server default). */
  readonly HIGHCHARTS_CACHE_PATH: string | undefined;
  /** Re-fetch Highcharts scripts on every start instead of using the cache. */
  readonly HIGHCHARTS_FORCE_FETCH: boolean;
  /** Whether metrics collection + the /metrics endpoint are enabled (default true). */
  readonly METRICS_ENABLED: boolean;
  /** Whether /metrics is served without auth (default false; reserved for 2.5). */
  readonly METRICS_PUBLIC: boolean;
  /** Interval (ms) for logging a metrics snapshot on STDIO; 0 disables (default 0). */
  readonly METRICS_LOG_INTERVAL_MS: number;
}

function parseTransport(value: string | undefined): TransportType {
  if (value === 'stdio' || value === 'http') return value;
  return 'stdio';
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') return value;
  return 'info';
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 3000;
}

function parseOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function parseBooleanDefaultTrue(value: string | undefined): boolean {
  return !(value === 'false' || value === '0');
}

function parseNonNegativeInt(value: string | undefined): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  return 0;
}

export const config: AppConfig = Object.freeze({
  PORT: parsePort(process.env['PORT']),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  LOG_LEVEL: parseLogLevel(process.env['LOG_LEVEL']),
  TRANSPORT: parseTransport(process.env['TRANSPORT']),
  SERVER_NAME: 'highchart-mcp-server',
  SERVER_VERSION: '1.0.0',
  HIGHCHARTS_CDN_URL: parseOptionalString(process.env['HIGHCHARTS_CDN_URL']),
  HIGHCHARTS_CACHE_PATH: parseOptionalString(process.env['HIGHCHARTS_CACHE_PATH']),
  HIGHCHARTS_FORCE_FETCH: parseBoolean(process.env['HIGHCHARTS_FORCE_FETCH']),
  METRICS_ENABLED: parseBooleanDefaultTrue(process.env['METRICS_ENABLED']),
  METRICS_PUBLIC: parseBoolean(process.env['METRICS_PUBLIC']),
  METRICS_LOG_INTERVAL_MS: parseNonNegativeInt(process.env['METRICS_LOG_INTERVAL_MS']),
});
