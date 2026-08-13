import exporter from 'highcharts-export-server';
import type { ExportSettings } from 'highcharts-export-server';
import type { HcConstructor } from '../charts/types.js';
import { logger } from '../utils/index.js';

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

export async function initExportService(): Promise<void> {
  if (_initialized) return;

  exporter.setOptions({
    pool: { minWorkers: 1, maxWorkers: 1 },
    logging: { level: 0 },
    listenToProcessExits: false,
    noLogo: true,
  });

  await new Promise<void>((resolve, reject) => {
    exporter.initExport((error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  _initialized = true;
  logger.info('Export service initialized');
}

export function shutdownExportService(): void {
  if (!_initialized) return;
  exporter.killPool();
  _initialized = false;
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

  const settings: ExportSettings = {
    export: {
      type: format,
      options: chartOptions,
      ...(overrides?.constr !== undefined && { constr: overrides.constr }),
      ...(overrides?.width !== undefined && { width: overrides.width }),
      ...(overrides?.height !== undefined && { height: overrides.height }),
      ...(overrides?.scale !== undefined && { scale: overrides.scale }),
    },
  };

  return new Promise<ExportOutput>((resolve, reject) => {
    exporter.startExport(settings, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({ format, data: result.result });
      }
    });
  });
}
