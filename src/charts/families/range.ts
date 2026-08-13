import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Range series where each point spans a low/high value.
 * Data points are `[x, low, high]` (or `{ x, low, high }`).
 * `errorbar` shares the same shape.
 */
export const rangeFamily: ChartFamily = seriesFamily({
  id: 'range',
  memberTypes: ['arearange', 'areasplinerange', 'columnrange', 'errorbar'],
  description: 'Range charts where each point has a low and high bound.',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<[x, low, high] | { x?, low, high }> }>',
  example: {
    type: 'columnrange',
    title: 'Temperature Range',
    xAxisCategories: ['Mon', 'Tue', 'Wed'],
    series: [{ name: 'Temps', data: [[0, 5, 12], [1, 7, 15], [2, 6, 13]] }],
  },
});
