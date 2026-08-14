import {
  buildFromInput,
  chartCatalog,
  CreateChartInputSchema,
  type ChartFamilyInput,
  type HcConstructor,
} from '../charts/index.js';
import {
  initExportService,
  shutdownExportService,
  exportChart,
  type ExportFormat,
} from '../services/index.js';
import { readInput, parseJson, writeOutput, printJson } from './io.js';

export interface CreateOptions {
  type?: string | undefined;
  input?: string | undefined;
  title?: string | undefined;
  format?: ExportFormat | undefined;
  constr?: HcConstructor | undefined;
  out?: string | undefined;
}

export async function createCommand(opts: CreateOptions): Promise<void> {
  const base = opts.input !== undefined ? parseJson(await readInput(opts.input)) : {};
  const merged: Record<string, unknown> = { ...base };
  if (opts.type !== undefined) merged['type'] = opts.type;
  if (opts.title !== undefined) merged['title'] = opts.title;

  // Precise, per-type validation (clear errors) before building.
  const parsed = CreateChartInputSchema.parse(merged) as ChartFamilyInput;
  const { options, constr } = buildFromInput(parsed);

  if (opts.format !== undefined) {
    await runExport(options, opts.format, { constr: opts.constr ?? constr }, opts.out);
    return;
  }
  printJson({ constr, options });
}

export interface RenderOptions {
  input?: string | undefined;
  format?: ExportFormat | undefined;
  constr?: HcConstructor | undefined;
  out?: string | undefined;
}

export async function renderCommand(opts: RenderOptions): Promise<void> {
  const options = parseJson(await readInput(opts.input));
  await runExport(options, opts.format ?? 'svg', { constr: opts.constr }, opts.out);
}

export interface ExportOptions extends RenderOptions {
  format: ExportFormat;
  width?: number | undefined;
  height?: number | undefined;
  scale?: number | undefined;
}

export async function exportCommand(opts: ExportOptions): Promise<void> {
  const options = parseJson(await readInput(opts.input));
  await runExport(
    options,
    opts.format,
    { constr: opts.constr, width: opts.width, height: opts.height, scale: opts.scale },
    opts.out,
  );
}

export interface ListTypesOptions {
  family?: string | undefined;
  json?: boolean | undefined;
}

export function listTypesCommand(opts: ListTypesOptions): void {
  const all = chartCatalog();
  const families = opts.family !== undefined ? all.filter((f) => f.family === opts.family) : all;

  if (opts.json === true) {
    printJson({ totalFamilies: families.length, families });
    return;
  }

  const lines: string[] = [];
  for (const f of families) {
    lines.push(`\n${f.family}  (constr: ${f.constr}${f.needsColorAxis ? ', colorAxis' : ''})`);
    lines.push(`  ${f.description}`);
    lines.push(`  data: ${f.dataShapeHint}`);
    lines.push(`  types: ${f.types.join(', ')}`);
  }
  process.stdout.write(`${lines.join('\n').trim()}\n`);
}

export interface ServeOptions {
  transport?: string | undefined;
  port?: number | undefined;
}

export async function serveCommand(opts: ServeOptions): Promise<void> {
  if (opts.transport !== undefined) process.env['TRANSPORT'] = opts.transport;
  if (opts.port !== undefined) process.env['PORT'] = String(opts.port);
  // Importing the entrypoint runs main() (init export service + start transport).
  await import('../index.js');
}

interface ExportOverridesCli {
  constr?: HcConstructor | undefined;
  width?: number | undefined;
  height?: number | undefined;
  scale?: number | undefined;
}

async function runExport(
  options: Record<string, unknown>,
  format: ExportFormat,
  overrides: ExportOverridesCli,
  out: string | undefined,
): Promise<void> {
  await initExportService();
  try {
    const cleaned: ExportOverridesCli = {};
    if (overrides.constr !== undefined) cleaned.constr = overrides.constr;
    if (overrides.width !== undefined) cleaned.width = overrides.width;
    if (overrides.height !== undefined) cleaned.height = overrides.height;
    if (overrides.scale !== undefined) cleaned.scale = overrides.scale;

    const result = await exportChart(options, format, cleaned);
    await writeOutput(result.data, result.format, out);
  } finally {
    await shutdownExportService();
  }
}
