import { describe, it, expect, vi } from 'vitest';

// Configure the Highcharts cdn/cache BEFORE the config + service modules load,
// so the export service forwards them into setOptions. Vitest isolates modules
// per test file, so this does not affect other specs.
process.env['HIGHCHARTS_CDN_URL'] = 'http://mirror.local/';
process.env['HIGHCHARTS_CACHE_PATH'] = '../../.hc-cache';
process.env['HIGHCHARTS_FORCE_FETCH'] = 'true';

const mockSetOptions = vi.fn((opts: unknown) => opts);
const mockInitExport = vi.fn(async () => {});
const mockStartExport = vi.fn();
const mockKillPool = vi.fn(async () => {});

vi.mock('highcharts-export-server', () => ({
  default: {
    setOptions: mockSetOptions,
    initExport: mockInitExport,
    startExport: mockStartExport,
    killPool: mockKillPool,
  },
}));

const { initExportService, shutdownExportService } = await import(
  '../../../src/services/exportService.js'
);

describe('exportService — highcharts cdn/cache config', () => {
  it('forwards cdnURL, cachePath and forceFetch into setOptions', async () => {
    await initExportService();

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        highcharts: expect.objectContaining({
          cdnURL: 'http://mirror.local/',
          cachePath: '../../.hc-cache',
          forceFetch: true,
        }),
      }),
    );

    await shutdownExportService();
  });
});
