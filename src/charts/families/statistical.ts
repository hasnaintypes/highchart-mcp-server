import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Specialized statistical / advanced series that share a flexible point shape
 * (numeric tuples or point objects). The exact tuple layout differs per type:
 *
 * - boxplot:  `[low, q1, median, q3, high]`
 * - variwide: `[category, value, width]`
 * - vector:   `[x, y, length, direction]`
 * - windbarb: `[x, value, direction]`
 * - dumbbell: `{ x, low, high }`
 * - bullet:   `{ y, target }`
 * - venn:     `{ name, sets: string[], value }`
 * - pictorial:`number[]` plus a series-level `paths: [{ d }]`
 *
 * See `dataShapeHint` / examples; Highcharts validates the exact layout at
 * render time.
 */
export const statisticalFamily: ChartFamily = seriesFamily({
  id: 'statistical',
  memberTypes: ['boxplot', 'variwide', 'vector', 'windbarb', 'dumbbell', 'bullet', 'venn', 'pictorial'],
  description:
    'Advanced statistical/specialized series (boxplot, variwide, vector, windbarb, dumbbell, bullet, venn, pictorial).',
  dataShapeHint:
    'Per type — boxplot: [low,q1,median,q3,high]; vector: [x,y,length,direction]; venn: { sets, value }; bullet: { y, target }; see docs.',
  example: {
    type: 'boxplot',
    title: 'Distribution',
    series: [{ name: 'Observations', data: [[760, 801, 848, 895, 965], [733, 853, 939, 980, 1080]] }],
  },
});
