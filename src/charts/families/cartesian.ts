import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { seriesFamily, enable3d } from '../shared.js';

/**
 * Simple cartesian series where each series is a list of numbers (or `[x, y]`
 * points / point objects). Includes column/bar variants, waterfall, dotplot,
 * lollipop, streamgraph and the 3D cylinder.
 */
export const cartesianFamily: ChartFamily = seriesFamily({
  id: 'cartesian',
  memberTypes: [
    'line',
    'spline',
    'area',
    'areaspline',
    'column',
    'bar',
    'scatter',
    'polygon',
    'streamgraph',
    'columnpyramid',
    'waterfall',
    'dotplot',
    'cylinder',
    'lollipop',
  ],
  description:
    'Standard cartesian charts (lines, areas, columns/bars, scatter and variants) where each series is a flat list of numbers or [x, y] points.',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<number | [x, y] | { x?, y, name? }> }>',
  example: {
    type: 'line',
    title: 'Monthly Sales',
    xAxisCategories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Revenue', data: [10, 20, 15] }],
  },
  decorate: (input: ChartFamilyInput, config) => {
    if (input.type === 'cylinder') enable3d(config);
  },
});
