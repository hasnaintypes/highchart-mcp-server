export type TransportType = 'stdio' | 'http';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  readonly PORT: number;
  readonly NODE_ENV: string;
  readonly LOG_LEVEL: LogLevel;
  readonly TRANSPORT: TransportType;
  readonly SERVER_NAME: string;
  readonly SERVER_VERSION: string;
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

export const config: AppConfig = Object.freeze({
  PORT: parsePort(process.env['PORT']),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  LOG_LEVEL: parseLogLevel(process.env['LOG_LEVEL']),
  TRANSPORT: parseTransport(process.env['TRANSPORT']),
  SERVER_NAME: 'highchart-mcp-server',
  SERVER_VERSION: '1.0.0',
});
