import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Gauge series (gauge, solidgauge) showing a single value on a dial. Data is a
 * list of numbers (one per pointer). A default pane + yAxis (0..100) is added;
 * override via series/passthrough options for custom ranges.
 */
export const gaugeFamily: ChartFamily = seriesFamily({
  id: 'gauge',
  memberTypes: ['gauge', 'solidgauge'],
  allowCategories: false,
  dataItem: z.union([z.number(), z.record(z.string(), z.unknown())]),
  description: 'Dial gauges (gauge, solidgauge) displaying a single value against a range.',
  dataShapeHint: 'series: Array<{ name?: string; data: number[] }>  // typically one value',
  example: {
    type: 'gauge',
    title: 'Speed',
    series: [{ name: 'km/h', data: [80] }],
  },
  decorate: (input: ChartFamilyInput, config) => {
    config['yAxis'] = { min: 0, max: 100 };
    config['pane'] = { startAngle: -90, endAngle: 90, center: ['50%', '75%'], size: '110%' };
    if (input.type === 'solidgauge') {
      config['pane'] = {
        startAngle: -90,
        endAngle: 90,
        center: ['50%', '75%'],
        size: '110%',
        background: [{ innerRadius: '60%', outerRadius: '100%', shape: 'arc' }],
      };
    }
  },
});
