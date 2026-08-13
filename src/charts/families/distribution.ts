import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { titleShape } from '../shared.js';

/**
 * Derived distribution series (histogram, bellcurve, pareto). These compute
 * their output from a base data series, so the input is a flat `baseData`
 * array; the builder creates a hidden base series plus the derived series
 * linked via `baseSeries`.
 */
const inputSchema = z.object({
  ...titleShape,
  name: z.string().optional(),
  baseData: z
    .array(z.number({ error: 'baseData values must be numbers' }))
    .min(1, { error: 'baseData must contain at least one number' }),
});

type DistributionInput = ChartFamilyInput & z.infer<typeof inputSchema>;

export const distributionFamily: ChartFamily = {
  id: 'distribution',
  memberTypes: ['histogram', 'bellcurve', 'pareto'],
  constr: 'chart',
  inputSchema,
  description:
    'Derived distribution charts (histogram, bellcurve, pareto) computed from a base data set.',
  dataShapeHint: 'baseData: number[]  // raw observations the distribution is derived from',
  example: {
    type: 'histogram',
    title: 'Score Distribution',
    baseData: [3.5, 3.0, 3.2, 4.1, 3.9, 2.8, 3.3, 3.7, 4.0, 3.1],
  },
  build(input: ChartFamilyInput): Record<string, unknown> {
    const d = input as DistributionInput;
    const baseType = input.type === 'pareto' ? 'column' : 'scatter';

    return {
      chart: {},
      title: { text: d.title ?? '' },
      ...(d.subtitle !== undefined ? { subtitle: { text: d.subtitle } } : {}),
      xAxis: [{ title: { text: 'Data' }, alignTicks: false }, { title: { text: input.type }, alignTicks: false, opposite: true }],
      yAxis: [{ title: { text: 'Values' } }, { title: { text: input.type }, opposite: true }],
      series: [
        {
          id: 'base',
          type: baseType,
          name: d.name ?? 'Data',
          data: d.baseData,
          visible: baseType === 'scatter',
        },
        {
          type: input.type,
          name: input.type,
          baseSeries: 'base',
          xAxis: 1,
          yAxis: 1,
          zIndex: -1,
        },
      ],
    };
  },
};
