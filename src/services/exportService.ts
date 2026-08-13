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
  const settings = exporter.setOptions({
    pool: { minWorkers: 1, maxWorkers: 1 },
    logging: { level: 1 },
    other: { noLogo: true },
    ...(highcharts !== undefined && { highcharts }),
  });

  await exporter.initExport(settings);

  _initialized = true;
  setGauge('highchart_export_pool_workers', 1, undefined, 'Number of export pool workers.');
  logger.info('Export service initialized', highcharts !== undefined ? { highcharts } : undefined);
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
      options: chartOptions,
      ...(overrides?.constr !== undefined && { constr: overrides.constr }),
      ...(overrides?.width !== undefined && { width: overrides.width }),
      ...(overrides?.height !== undefined && { height: overrides.height }),
      ...(overrides?.scale !== undefined && { scale: overrides.scale }),
    },
  });

  const constr = overrides?.constr ?? 'chart';
  const start = Date.now();

  return new Promise<ExportOutput>((resolve, reject) => {
    exporter.startExport(settings, (error, info) => {
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
