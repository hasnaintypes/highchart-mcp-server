import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput } from '../types.js';

/**
 * Seed family covering the simple single-value cartesian + pie types carried
 * over from the Phase 1 MVP. Data is a plain `number[]` per series.
 *
 * NOTE (Phase 2.2): `pie` will move to a dedicated `named` family and the
 * remaining types will be joined by additional cartesian variants (ranges,
 * waterfall, streamgraph, ...). This seed exists so the registry is functional
 * and testable during 2.1 without changing MVP behavior.
 */

const SeriesSchema = z.object({
  name: z.string().optional(),
  data: z.array(z.number({ error: 'series[].data values must be numbers' })),
});

export const cartesianInputSchema = z.object({
  title: z.string().optional(),
  xAxisCategories: z.array(z.string()).optional(),
  series: z
    .array(SeriesSchema)
    .min(1, { error: 'series must contain at least one data series' }),
});

type CartesianInput = z.infer<typeof cartesianInputSchema> & { type: string };

export const cartesianFamily: ChartFamily = {
  id: 'cartesian',
  memberTypes: ['line', 'spline', 'area', 'areaspline', 'column', 'bar', 'scatter', 'pie'],
  constr: 'chart',
  inputSchema: cartesianInputSchema,
  description:
    'Simple cartesian and pie charts where each series is a flat list of numbers.',
  dataShapeHint: 'series: Array<{ name?: string; data: number[] }>',
  example: {
    type: 'line',
    title: 'Monthly Sales',
    xAxisCategories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Revenue', data: [10, 20, 15] }],
  },
  build(input: ChartFamilyInput): Record<string, unknown> {
    const data = input as CartesianInput;

    const config: Record<string, unknown> = {
      chart: { type: data.type },
      title: { text: data.title ?? '' },
      series: data.series.map((s) => ({
        ...(s.name !== undefined ? { name: s.name } : {}),
        data: s.data,
      })),
    };

    if (data.xAxisCategories !== undefined && data.type !== 'pie') {
      config['xAxis'] = { categories: data.xAxisCategories };
    }

    return config;
  },
};
