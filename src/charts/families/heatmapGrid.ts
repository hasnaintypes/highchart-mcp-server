import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Grid heatmap series (heatmap, tilemap). Data points are `[x, y, value]`
 * (or `{ x, y, value }`). A `colorAxis` is added automatically.
 */
export const heatmapGridFamily: ChartFamily = seriesFamily({
  id: 'heatmapGrid',
  memberTypes: ['heatmap', 'tilemap'],
  needsColorAxis: true,
  allowCategories: false,
  description: 'Grid heatmaps and tilemaps where each cell has an x, y and value.',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<[x, y, value] | { x, y, value }> }>',
  example: {
    type: 'heatmap',
    title: 'Activity',
    series: [{ name: 'Hits', data: [[0, 0, 5], [0, 1, 8], [1, 0, 2], [1, 1, 9]] }],
  },
});
