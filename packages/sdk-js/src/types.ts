/** Public types for the Highcharts MCP SDK (self-contained; no server import). */

export type ExportFormat = 'svg' | 'png' | 'pdf';
export type HcConstructor = 'chart' | 'stockChart' | 'mapChart' | 'ganttChart';

/** Structured input for the `create_chart` tool. Fields vary by chart family. */
export interface CreateChartInput {
  type: string;
  title?: string;
  subtitle?: string;
  xAxisCategories?: string[];
  series?: Array<Record<string, unknown>>;
  /** Distribution charts (histogram/bellcurve/pareto). */
  baseData?: number[];
  /** Gantt charts. */
  tasks?: Array<Record<string, unknown>>;
  /** Maps. */
  topology?: Record<string, unknown>;
  joinBy?: string | [string, string];
  provider?: Record<string, unknown>;
  data?: unknown[];
  /** When set, the server renders and returns an image instead of config JSON. */
  format?: ExportFormat;
  [key: string]: unknown;
}

/** Result of `create_chart` when no `format` is requested. */
export interface CreateChartResult {
  constr: HcConstructor;
  options: Record<string, unknown>;
}

/** A full Highcharts options object for the raw render/export tools. */
export interface ChartOptions {
  chart: { type: string; [key: string]: unknown };
  series: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Result of render/export (and create_chart when a `format` is given). */
export interface RenderResult {
  config: unknown;
  format: ExportFormat;
  data: string;
}

export interface RenderOptions {
  format?: ExportFormat;
  constr?: HcConstructor;
}

export interface ExportOptions {
  format: ExportFormat;
  constr?: HcConstructor;
  width?: number;
  height?: number;
  scale?: number;
}

export interface FamilyCatalogEntry {
  family: string;
  constr: HcConstructor;
  types: string[];
  needsColorAxis: boolean;
  description: string;
  dataShapeHint: string;
  example: unknown;
}

export interface ListChartTypesResult {
  totalTypes: number;
  totalFamilies: number;
  families: FamilyCatalogEntry[];
}
