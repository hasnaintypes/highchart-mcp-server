import { z } from 'zod/v4';

/**
 * Highcharts constructor required to render a given chart family.
 * - `chart`      — the default; covers most core series types.
 * - `stockChart` — financial/stock features (ohlc, candlestick, flags, navigator).
 * - `mapChart`   — map series (choropleth, mapbubble, mappoint, ...).
 * - `ganttChart` — gantt task/dependency charts.
 */
export type HcConstructor = 'chart' | 'stockChart' | 'mapChart' | 'ganttChart';

/** Validated `create_chart` input always carries the `type` discriminator. */
export type ChartFamilyInput = Record<string, unknown> & { type: string };

/**
 * A `ChartFamily` groups Highcharts series types that share the same input
 * data shape and constructor. Each family owns:
 * - a Zod object schema for its `create_chart` input (data-shape specific),
 * - a builder mapping validated input to a full Highcharts options object,
 * - discovery metadata used by the `list_chart_types` tool.
 *
 * The `inputSchema` must be a `ZodObject` and must NOT declare the `type`
 * discriminator — the registry extends each schema with a `type` literal per
 * member type when generating the discriminated union.
 */
export interface ChartFamily {
  /** Stable family id, e.g. 'cartesian', 'financial', 'maps'. */
  readonly id: string;
  /** Series types this family owns, e.g. ['line','spline','area']. */
  readonly memberTypes: readonly string[];
  /** Constructor required to render this family. */
  readonly constr: HcConstructor;
  /**
   * Zod object schema for this family's `create_chart` input. Must not include
   * the `type` key — the registry adds a `type` literal per member type.
   */
  readonly inputSchema: z.ZodObject<z.ZodRawShape>;
  /** Builds a full Highcharts options object from validated input. */
  build(input: ChartFamilyInput): Record<string, unknown>;
  /** Whether the family needs a colorAxis (heatmap, maps, ...). */
  readonly needsColorAxis?: boolean;
  /** Short human description (for `list_chart_types`). */
  readonly description: string;
  /** Data-shape hint string (for `list_chart_types` and error guidance). */
  readonly dataShapeHint: string;
  /** Minimal working example input (for `list_chart_types` docs). */
  readonly example: unknown;
}

/** Result of building a chart config from registry input. */
export interface BuiltChart {
  readonly options: Record<string, unknown>;
  readonly constr: HcConstructor;
}
