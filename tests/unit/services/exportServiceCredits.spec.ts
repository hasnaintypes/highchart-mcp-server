import { describe, it, expect, vi } from 'vitest';

// A license id is present, and credits are explicitly disabled → allowed.
process.env['HIGHCHARTS_LICENSE_ID'] = 'HL-TEST-123';
process.env['HIGHCHARTS_CREDITS_ENABLED'] = 'false';

const mockSetOptions = vi.fn((opts: unknown) => opts);
const mockInitExport = vi.fn(async () => {});
const mockStartExport = vi.fn(
  (_settings: unknown, cb: (error: Error | false, info: { result: string }) => void) => {
    cb(false, { result: '<svg/>' });
  },
);
const mockKillPool = vi.fn(async () => {});

vi.mock('highcharts-export-server', () => ({
  default: {
    setOptions: mockSetOptions,
    initExport: mockInitExport,
    startExport: mockStartExport,
    killPool: mockKillPool,
  },
}));

const { config } = await import('../../../src/config/index.js');
const { initExportService, shutdownExportService, exportChart } = await import(
  '../../../src/services/exportService.js'
);

describe('exportService — Highcharts credits/license', () => {
  it('allows disabling credits when a license id is set', () => {
    expect(config.HIGHCHARTS_LICENSE_ID).toBe('HL-TEST-123');
    expect(config.HIGHCHARTS_CREDITS_ENABLED).toBe(false);
  });

  it('injects credits into chart options when the caller omits them', async () => {
    await initExportService();
    await exportChart({ chart: { type: 'line' }, series: [{ data: [1] }] }, 'svg');

    const settings = mockStartExport.mock.calls.at(-1)?.[0] as {
      export: { options: { credits?: { enabled: boolean } } };
    };
    expect(settings.export.options.credits).toEqual({ enabled: false });
    await shutdownExportService();
  });

  it('does not override caller-provided credits', async () => {
    await initExportService();
    await exportChart(
      { chart: { type: 'line' }, series: [{ data: [1] }], credits: { enabled: true, text: 'Mine' } },
      'svg',
    );

    const settings = mockStartExport.mock.calls.at(-1)?.[0] as {
      export: { options: { credits?: { enabled: boolean; text?: string } } };
    };
    expect(settings.export.options.credits).toEqual({ enabled: true, text: 'Mine' });
    await shutdownExportService();
  });
});
