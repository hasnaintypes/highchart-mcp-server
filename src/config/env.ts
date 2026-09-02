export type TransportType = 'stdio' | 'http';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AuthStrategy = 'none' | 'apikey' | 'jwt' | 'oauth';

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
  /**
   * Highcharts license id/attestation held by the operator. Recorded for audit
   * and required (must be non-empty) before chart credits can be disabled.
   * A valid Highcharts license is legally required for commercial/production use.
   */
  readonly HIGHCHARTS_LICENSE_ID: string | undefined;
  /**
   * Whether the "Highcharts.com" credits attribution is shown on charts.
   * Defaults to `true` (attribution kept — compliant without a license).
   * Can only be set to `false` when a HIGHCHARTS_LICENSE_ID is provided.
   */
  readonly HIGHCHARTS_CREDITS_ENABLED: boolean;
  /** Max time (ms) a single chart export may take before it is aborted (default 30000). */
  readonly EXPORT_TIMEOUT_MS: number;
  /** Number of export pool workers (concurrent renders); default 2. */
  readonly EXPORT_MAX_WORKERS: number;
  /** Extra Chromium args for Puppeteer (comma-separated), e.g. --no-sandbox in containers. */
  readonly PUPPETEER_ARGS: string[];
  /** Max accepted HTTP request body size in bytes for /mcp (default 5_000_000). */
  readonly HTTP_MAX_BODY_BYTES: number;
  /** Max concurrent MCP HTTP sessions before new ones are rejected (default 100). */
  readonly HTTP_MAX_SESSIONS: number;
  /** Authentication strategy for the HTTP transport (default 'none'). */
  readonly AUTH_STRATEGY: AuthStrategy;
  /** Comma-separated API keys ("key" or "id:key:scope1|scope2") for apikey strategy. */
  readonly API_KEYS: string | undefined;
  /** HS256 secret for jwt strategy. */
  readonly JWT_SECRET: string | undefined;
  /** Expected JWT issuer (optional). */
  readonly JWT_ISSUER: string | undefined;
  /** Expected JWT audience (optional). */
  readonly JWT_AUDIENCE: string | undefined;
  /** Scopes every authenticated request must hold (comma-separated). */
  readonly AUTH_REQUIRED_SCOPES: string[];
  /**
   * Canonical external base URL of this server (e.g. `https://charts.example.com`,
   * no trailing slash). Required for AUTH_STRATEGY=oauth: used as the OAuth issuer,
   * the token audience, and in the `.well-known` discovery documents. The process
   * cannot infer this itself when run behind a reverse proxy/load balancer.
   */
  readonly PUBLIC_URL: string | undefined;
  /** Lifetime (ms) of OAuth access tokens issued by AUTH_STRATEGY=oauth (default 3600000). */
  readonly OAUTH_ACCESS_TOKEN_TTL_MS: number;
  /** Lifetime (ms) of OAuth authorization codes issued by AUTH_STRATEGY=oauth (default 60000). */
  readonly OAUTH_CODE_TTL_MS: number;
  /** Whether to enforce rate limiting on the HTTP transport (default false). */
  readonly RATE_LIMIT_ENABLED: boolean;
  /** Sustained requests per minute per client (default 120). */
  readonly RATE_LIMIT_RPM: number;
  /** Burst capacity (max tokens) per client (default 20). */
  readonly RATE_LIMIT_BURST: number;
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

function parsePositiveIntDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  return fallback;
}

function parseAuthStrategy(value: string | undefined): AuthStrategy {
  if (value === 'apikey' || value === 'jwt' || value === 'oauth' || value === 'none') return value;
  return 'none';
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function parseCsv(value: string | undefined): string[] {
  if (value === undefined) return [];
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

const publicUrlRaw = parseOptionalString(process.env['PUBLIC_URL']);
const publicUrl = publicUrlRaw === undefined ? undefined : stripTrailingSlash(publicUrlRaw);

const licenseId = parseOptionalString(process.env['HIGHCHARTS_LICENSE_ID']);
// Credits attribution may only be removed with a valid license. Without a
// license id we always keep credits on, regardless of the requested value.
const creditsRequested = parseBooleanDefaultTrue(process.env['HIGHCHARTS_CREDITS_ENABLED']);
const creditsEnabled = licenseId === undefined ? true : creditsRequested;

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
  HIGHCHARTS_LICENSE_ID: licenseId,
  HIGHCHARTS_CREDITS_ENABLED: creditsEnabled,
  EXPORT_TIMEOUT_MS: parsePositiveIntDefault(process.env['EXPORT_TIMEOUT_MS'], 30000),
  EXPORT_MAX_WORKERS: parsePositiveIntDefault(process.env['EXPORT_MAX_WORKERS'], 2),
  PUPPETEER_ARGS: parseCsv(process.env['PUPPETEER_ARGS']),
  HTTP_MAX_BODY_BYTES: parsePositiveIntDefault(process.env['HTTP_MAX_BODY_BYTES'], 5_000_000),
  HTTP_MAX_SESSIONS: parsePositiveIntDefault(process.env['HTTP_MAX_SESSIONS'], 100),
  AUTH_STRATEGY: parseAuthStrategy(process.env['AUTH_STRATEGY']),
  API_KEYS: parseOptionalString(process.env['API_KEYS']),
  JWT_SECRET: parseOptionalString(process.env['JWT_SECRET']),
  JWT_ISSUER: parseOptionalString(process.env['JWT_ISSUER']),
  JWT_AUDIENCE: parseOptionalString(process.env['JWT_AUDIENCE']),
  AUTH_REQUIRED_SCOPES: parseCsv(process.env['AUTH_REQUIRED_SCOPES']),
  PUBLIC_URL: publicUrl,
  OAUTH_ACCESS_TOKEN_TTL_MS: parsePositiveIntDefault(process.env['OAUTH_ACCESS_TOKEN_TTL_MS'], 3_600_000),
  OAUTH_CODE_TTL_MS: parsePositiveIntDefault(process.env['OAUTH_CODE_TTL_MS'], 60_000),
  RATE_LIMIT_ENABLED: parseBoolean(process.env['RATE_LIMIT_ENABLED']),
  RATE_LIMIT_RPM: parsePositiveIntDefault(process.env['RATE_LIMIT_RPM'], 120),
  RATE_LIMIT_BURST: parsePositiveIntDefault(process.env['RATE_LIMIT_BURST'], 20),
});
