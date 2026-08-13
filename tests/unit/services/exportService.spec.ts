import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSetOptions = vi.fn();
const mockInitExport = vi.fn((_cb: (error?: Error) => void) => { _cb(); });
const mockStartExport = vi.fn();
const mockKillPool = vi.fn();

vi.mock('highcharts-export-server', () => ({
  default: {
    setOptions: mockSetOptions,
    initExport: mockInitExport,
    startExport: mockStartExport,
    killPool: mockKillPool,
  },
}));

// Dynamic import so the mock is in place before the module loads
const { initExportService, shutdownExportService, exportChart } = await import(
  '../../../src/services/exportService.js'
);

describe('exportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset internal state by shutting down
    shutdownExportService();
  });

  describe('initExportService', () => {
    it('should call setOptions and initExport with correct flags', async () => {
      await initExportService();

      expect(mockSetOptions).toHaveBeenCalledOnce();
      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          listenToProcessExits: false,
          noLogo: true,
        }),
      );
      expect(mockInitExport).toHaveBeenCalledOnce();
    });

    it('should be idempotent — second call is a no-op', async () => {
      await initExportService();
      await initExportService();

      expect(mockSetOptions).toHaveBeenCalledTimes(1);
      expect(mockInitExport).toHaveBeenCalledTimes(1);
    });

    it('should reject when initExport returns an error', async () => {
      mockInitExport.mockImplementationOnce((cb: (error?: Error) => void) => {
        cb(new Error('Puppeteer failed'));
      });

      // Shut down to reset _initialized for this test
      shutdownExportService();

      await expect(initExportService()).rejects.toThrow('Puppeteer failed');
    });
  });

  describe('shutdownExportService', () => {
    it('should call killPool', async () => {
      await initExportService();
      shutdownExportService();

      expect(mockKillPool).toHaveBeenCalledOnce();
    });

    it('should be a no-op if not initialized', () => {
      shutdownExportService();
      expect(mockKillPool).not.toHaveBeenCalled();
    });
  });

  describe('exportChart', () => {
    it('should throw if not initialized', async () => {
      await expect(exportChart({}, 'svg')).rejects.toThrow('not initialized');
    });

    it('should resolve with format and data on success', async () => {
      mockStartExport.mockImplementation(
        (_settings: unknown, cb: (error: Error | false, result: { result: string }) => void) => {
          cb(false, { result: '<svg>mock</svg>' });
        },
      );

      await initExportService();
      const output = await exportChart(
        { chart: { type: 'line' }, series: [{ data: [1, 2, 3] }] },
        'svg',
      );

      expect(output).toEqual({ format: 'svg', data: '<svg>mock</svg>' });
    });

    it('should reject on callback error', async () => {
      mockStartExport.mockImplementation(
        (_settings: unknown, cb: (error: Error | false, result: { result: string }) => void) => {
          cb(new Error('Export failed'), { result: '' });
        },
      );

      await initExportService();
      await expect(
        exportChart({ chart: { type: 'line' }, series: [{ data: [1] }] }, 'png'),
      ).rejects.toThrow('Export failed');
    });

    it('should pass width, height, and scale overrides', async () => {
      mockStartExport.mockImplementation(
        (settings: unknown, cb: (error: Error | false, result: { result: string }) => void) => {
          cb(false, { result: 'base64data' });
        },
      );

      await initExportService();
      await exportChart(
        { chart: { type: 'bar' }, series: [{ data: [1] }] },
        'png',
        { width: 800, height: 600, scale: 2 },
      );

      expect(mockStartExport).toHaveBeenCalledWith(
        expect.objectContaining({
          export: expect.objectContaining({
            type: 'png',
            width: 800,
            height: 600,
            scale: 2,
          }),
        }),
        expect.any(Function),
      );
    });

    it('should pass the constr override through to export settings', async () => {
      mockStartExport.mockImplementation(
        (_settings: unknown, cb: (error: Error | false, result: { result: string }) => void) => {
          cb(false, { result: '<svg>ohlc</svg>' });
        },
      );

      await initExportService();
      await exportChart(
        { chart: { type: 'candlestick' }, series: [{ data: [[1, 2, 3, 4, 5]] }] },
        'svg',
        { constr: 'stockChart' },
      );

      expect(mockStartExport).toHaveBeenCalledWith(
        expect.objectContaining({
          export: expect.objectContaining({ constr: 'stockChart' }),
        }),
        expect.any(Function),
      );
    });

    it('should not set constr when not provided', async () => {
      mockStartExport.mockImplementation(
        (_settings: unknown, cb: (error: Error | false, result: { result: string }) => void) => {
          cb(false, { result: '<svg/>' });
        },
      );

      await initExportService();
      await exportChart({ chart: { type: 'line' }, series: [{ data: [1] }] }, 'svg');

      const settings = mockStartExport.mock.calls[0]?.[0] as {
        export: Record<string, unknown>;
      };
      expect(settings.export).not.toHaveProperty('constr');
    });
  });
});
