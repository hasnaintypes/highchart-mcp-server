import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInit = vi.fn(async () => {});
const mockShutdown = vi.fn(async () => {});
const mockExport = vi.fn(async (_o: unknown, format: string) => ({ format, data: '<svg>mock</svg>' }));

vi.mock('../../../src/services/index.js', () => ({
  initExportService: mockInit,
  shutdownExportService: mockShutdown,
  exportChart: mockExport,
}));

// Keep real parseJson/writeOutput/printJson, but make readInput controllable.
const mockReadInput = vi.fn(async () => '');
vi.mock('../../../src/cli/io.js', async (importActual) => {
  const actual = await importActual<typeof import('../../../src/cli/io.js')>();
  return { ...actual, readInput: mockReadInput };
});

const { createCommand, renderCommand, exportCommand, listTypesCommand } = await import(
  '../../../src/cli/commands.js'
);

function captureStdout(): { restore: () => void; get: () => string } {
  let buf = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    buf += String(chunk);
    return true;
  });
  return { restore: () => spy.mockRestore(), get: () => buf };
}

describe('CLI commands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create prints { constr, options } when no format', async () => {
    mockReadInput.mockResolvedValue('{"series":[{"data":[1,2,3]}]}');
    const cap = captureStdout();
    await createCommand({ type: 'line', title: 'T', input: '-', format: undefined });
    cap.restore();
    const out = JSON.parse(cap.get());
    expect(out.constr).toBe('chart');
    expect(out.options.chart.type).toBe('line');
    expect(out.options.title.text).toBe('T');
    expect(mockExport).not.toHaveBeenCalled();
  });

  it('create renders when --format is given (svg to stdout)', async () => {
    mockReadInput.mockResolvedValue('{"series":[{"data":[1,2]}]}');
    const cap = captureStdout();
    await createCommand({ type: 'bar', input: '-', format: 'svg' });
    cap.restore();
    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockExport).toHaveBeenCalledWith(
      expect.objectContaining({ chart: { type: 'bar' } }),
      'svg',
      expect.objectContaining({ constr: 'chart' }),
    );
    expect(cap.get()).toContain('<svg>mock</svg>');
    expect(mockShutdown).toHaveBeenCalledOnce();
  });

  it('create rejects an unknown type', async () => {
    await expect(createCommand({ type: 'nope' })).rejects.toBeTruthy();
  });

  it('render reads options JSON and forwards constr', async () => {
    mockReadInput.mockResolvedValue('{"chart":{"type":"candlestick"},"series":[{"data":[[1,2,3,1,2]]}]}');
    const cap = captureStdout();
    await renderCommand({ input: '-', format: 'svg', constr: 'stockChart' });
    cap.restore();
    expect(mockExport).toHaveBeenCalledWith(
      expect.objectContaining({ chart: { type: 'candlestick' } }),
      'svg',
      expect.objectContaining({ constr: 'stockChart' }),
    );
  });

  it('export forwards format + dimension overrides', async () => {
    mockReadInput.mockResolvedValue('{"chart":{"type":"column"},"series":[{"data":[1,2]}]}');
    await exportCommand({ input: '-', format: 'png', width: 800, height: 600, scale: 2 });
    expect(mockExport).toHaveBeenCalledWith(
      expect.objectContaining({ chart: { type: 'column' } }),
      'png',
      expect.objectContaining({ width: 800, height: 600, scale: 2 }),
    );
  });

  it('list-types --json lists families', () => {
    const cap = captureStdout();
    listTypesCommand({ json: true });
    cap.restore();
    const out = JSON.parse(cap.get());
    expect(out.totalFamilies).toBeGreaterThan(0);
    expect(Array.isArray(out.families)).toBe(true);
  });

  it('list-types --family filters', () => {
    const cap = captureStdout();
    listTypesCommand({ family: 'financial', json: true });
    cap.restore();
    const out = JSON.parse(cap.get());
    expect(out.families).toHaveLength(1);
    expect(out.families[0].family).toBe('financial');
  });
});
