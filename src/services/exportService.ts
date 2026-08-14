import exporter from 'highcharts-export-server';
import type { ExportServerOptions, ExportSettings } from 'highcharts-export-server';
import type { HcConstructor } from '../charts/types.js';
import { config } from '../config/index.js';
import { logger } from '../utils/index.js';
import { incr, observe, setGauge } from '../metrics/index.js';

export type ExportFormat = 'svg' | 'png' | 'pdf';

export interface ExportOutput {
  format: ExportFormat;
  data: string;
}

export interface ExportOverrides {
  width?: number;
  height?: number;
  scale?: number;
  /** Highcharts constructor to render with (defaults to 'chart'). */
  constr?: HcConstructor;
}

let _initialized = false;

function buildHighchartsOptions(): ExportServerOptions['highcharts'] | undefined {
  const hc: NonNullable<ExportServerOptions['highcharts']> = {};
  if (config.HIGHCHARTS_CDN_URL !== undefined) hc.cdnURL = config.HIGHCHARTS_CDN_URL;
  if (config.HIGHCHARTS_CACHE_PATH !== undefined) hc.cachePath = config.HIGHCHARTS_CACHE_PATH;
  if (config.HIGHCHARTS_FORCE_FETCH) hc.forceFetch = true;
  return Object.keys(hc).length > 0 ? hc : undefined;
}

export async function initExportService(): Promise<void> {
  if (_initialized) return;

  const highcharts = buildHighchartsOptions();
  const maxWorkers = config.EXPORT_MAX_WORKERS;
  const settings = exporter.setOptions({
    pool: { minWorkers: 1, maxWorkers: maxWorkers },
    logging: { level: 1 },
    other: { noLogo: true },
    ...(config.PUPPETEER_ARGS.length > 0 && { puppeteer: { args: config.PUPPETEER_ARGS } }),
    ...(highcharts !== undefined && { highcharts }),
  });

  await exporter.initExport(settings);

  _initialized = true;
  setGauge('highchart_export_pool_workers', maxWorkers, undefined, 'Number of export pool workers.');
  logger.info('Export service initialized', highcharts !== undefined ? { highcharts } : undefined);

  // Highcharts licensing notice. Attribution is kept on by default (free /
  // non-commercial use). Commercial/production use requires a Highcharts license.
  if (config.HIGHCHARTS_LICENSE_ID !== undefined) {
    logger.info('Highcharts license configured', {
      licenseId: config.HIGHCHARTS_LICENSE_ID,
      creditsEnabled: config.HIGHCHARTS_CREDITS_ENABLED,
    });
  } else {
    logger.info(
      'Highcharts credits attribution enabled (free/non-commercial use). ' +
        'Set HIGHCHARTS_LICENSE_ID for licensed/commercial use to allow disabling credits.',
    );
  }
}

/**
 * Applies the configured credits attribution to a chart's options unless the
 * caller already specified `credits`. Keeping credits on satisfies the free /
 * non-commercial Highcharts license; removing them requires a valid license
 * (gated by HIGHCHARTS_LICENSE_ID in config).
 */
function applyCredits(chartOptions: Record<string, unknown>): Record<string, unknown> {
  if (Object.prototype.hasOwnProperty.call(chartOptions, 'credits')) {
    return chartOptions;
  }
  return { ...chartOptions, credits: { enabled: config.HIGHCHARTS_CREDITS_ENABLED } };
}

export async function shutdownExportService(): Promise<void> {
  if (!_initialized) return;
  await exporter.killPool();
  _initialized = false;
  setGauge('highchart_export_pool_workers', 0, undefined, 'Number of export pool workers.');
  logger.info('Export service shut down');
}

export async function exportChart(
  chartOptions: Record<string, unknown>,
  format: ExportFormat,
  overrides?: ExportOverrides,
): Promise<ExportOutput> {
  if (!_initialized) {
    throw new Error('Export service not initialized. Call initExportService() first.');
  }

  const settings: ExportSettings = exporter.setOptions({
    export: {
      type: format,
      options: applyCredits(chartOptions),
      ...(overrides?.constr !== undefined && { constr: overrides.constr }),
      ...(overrides?.width !== undefined && { width: overrides.width }),
      ...(overrides?.height !== undefined && { height: overrides.height }),
      ...(overrides?.scale !== undefined && { scale: overrides.scale }),
    },
  });

  const constr = overrides?.constr ?? 'chart';
  const start = Date.now();
  const timeoutMs = config.EXPORT_TIMEOUT_MS;

  return new Promise<ExportOutput>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      incr(
        'highchart_exports_total',
        { format, constr, status: 'timeout' },
        'Total chart exports by format, constructor and status.',
      );
      reject(new Error(`Chart export timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    exporter.startExport(settings, (error, info) => {
      if (settled) return; // already timed out
      settled = true;
      clearTimeout(timer);

      const durationSeconds = (Date.now() - start) / 1000;
      observe(
        'highchart_export_duration_seconds',
        durationSeconds,
        { format },
        'Chart export duration in seconds by format.',
      );
      if (error) {
        incr(
          'highchart_exports_total',
          { format, constr, status: 'error' },
          'Total chart exports by format, constructor and status.',
        );
        reject(error);
      } else {
        incr(
          'highchart_exports_total',
          { format, constr, status: 'ok' },
          'Total chart exports by format, constructor and status.',
        );
        resolve({ format, data: info.result });
      }
    });
  });
}
