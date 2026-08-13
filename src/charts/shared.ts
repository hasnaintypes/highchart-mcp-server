import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput, HcConstructor } from './types.js';

/**
 * A permissive point schema accepting the common Highcharts data forms:
 * a bare number, a numeric tuple (e.g. `[x, y]`, `[x, low, high]`,
 * `[x, open, high, low, close]`), or a point object (`{ name, y, ... }`).
 * Highcharts performs the authoritative validation at render time; this layer
 * guards structure and yields readable errors, guided by each family's
 * `dataShapeHint`.
 */
export const flexiblePoint = z.union([
  z.number().nullable(),
  z.array(z.number().nullable()),
  z.record(z.string(), z.unknown()),
]);

/** Shared title/subtitle fields present on every family input. */
export const titleShape = {
  title: z.string().optional(),
  subtitle: z.string().optional(),
} as const;

export interface SeriesFamilyConfig {
  id: string;
  memberTypes: string[];
  constr?: HcConstructor;
  /** Zod schema for a single data point (defaults to `flexiblePoint`). */
  dataItem?: z.ZodTypeAny;
  description: string;
  dataShapeHint: string;
  example: unknown;
  needsColorAxis?: boolean;
  /** Whether `xAxisCategories` is accepted/emitted (default true). */
  allowCategories?: boolean;
  /** Hook to add family/type-specific options (pane, options3d, ...). */
  decorate?: (input: ChartFamilyInput, config: Record<string, unknown>) => void;
}

type SeriesInput = ChartFamilyInput & {
  title?: string;
  subtitle?: string;
  xAxisCategories?: string[];
  series: Array<Record<string, unknown> & { data: unknown[] }>;
};

/**
 * Factory for the common "chart with an array of series, each holding a list of
 * points" shape. Covers the large majority of Highcharts series types. Series
 * objects are passed through (extra keys like `colorByPoint`, `keys`, `paths`,
 * `nodes` are preserved), so power users can still supply advanced options.
 */
export function seriesFamily(cfg: SeriesFamilyConfig): ChartFamily {
  const dataItem = cfg.dataItem ?? flexiblePoint;
  const allowCategories = cfg.allowCategories !== false;

  const seriesSchema = z
    .object({
      name: z.string().optional(),
      data: z
        .array(dataItem)
        .min(1, { error: 'series[].data must contain at least one point' }),
    })
    .passthrough();

  const inputSchema = z.object({
    ...titleShape,
    ...(allowCategories ? { xAxisCategories: z.array(z.string()).optional() } : {}),
    series: z
      .array(seriesSchema)
      .min(1, { error: 'series must contain at least one data series' }),
  });

  return {
    id: cfg.id,
    memberTypes: cfg.memberTypes,
    constr: cfg.constr ?? 'chart',
    inputSchema,
    ...(cfg.needsColorAxis !== undefined ? { needsColorAxis: cfg.needsColorAxis } : {}),
    description: cfg.description,
    dataShapeHint: cfg.dataShapeHint,
    example: cfg.example,
    build(input: ChartFamilyInput): Record<string, unknown> {
      const d = input as SeriesInput;
      const config: Record<string, unknown> = {
        chart: { type: input.type },
        title: { text: d.title ?? '' },
        series: d.series.map((s) => ({ ...s })),
      };
      if (d.subtitle !== undefined) config['subtitle'] = { text: d.subtitle };
      if (allowCategories && d.xAxisCategories !== undefined) {
        config['xAxis'] = { categories: d.xAxisCategories };
      }
      if (cfg.needsColorAxis) config['colorAxis'] = {};
      cfg.decorate?.(input, config);
      return config;
    },
  };
}

/** Adds a sensible default 3D scene; used by cylinder/scatter3d/*3d types. */
export function enable3d(config: Record<string, unknown>): void {
  const chart = (config['chart'] ?? {}) as Record<string, unknown>;
  chart['options3d'] = { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 };
  config['chart'] = chart;
}
