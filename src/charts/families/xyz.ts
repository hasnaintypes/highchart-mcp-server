import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { seriesFamily, enable3d } from '../shared.js';

/**
 * Three-dimensional value series: bubble/packedbubble/scatter3d.
 * Data points are `[x, y, z]` (or `{ x, y, z }`); for packedbubble the third
 * value is the bubble value.
 */
export const xyzFamily: ChartFamily = seriesFamily({
  id: 'xyz',
  memberTypes: ['bubble', 'packedbubble', 'scatter3d'],
  description: 'Charts with a third value per point (bubble size or z-depth).',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<[x, y, z] | { x, y, z }> }>',
  example: {
    type: 'bubble',
    title: 'Sales vs Cost vs Volume',
    series: [{ name: 'Products', data: [[1, 2, 5], [3, 4, 9], [5, 1, 3]] }],
  },
  decorate: (input: ChartFamilyInput, config) => {
    if (input.type === 'scatter3d') enable3d(config);
  },
});
