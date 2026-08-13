import type { ChartFamily } from '../types.js';
import { cartesianFamily } from './cartesian.js';
import { rangeFamily } from './range.js';
import { namedFamily } from './named.js';
import { xyzFamily } from './xyz.js';
import { financialFamily } from './financial.js';
import { flagsFamily } from './flags.js';
import { heatmapGridFamily } from './heatmapGrid.js';
import { hierarchicalFamily } from './hierarchical.js';
import { nodeLinkFamily } from './nodeLink.js';
import { gaugeFamily } from './gauge.js';
import { statisticalFamily } from './statistical.js';
import { distributionFamily } from './distribution.js';
import { xrangeFamily } from './xrange.js';
import { mapsFamily } from './maps.js';
import { ganttFamily } from './gantt.js';

/**
 * Ordered list of all chart families. Together these cover every Highcharts
 * 12.x series type (70 total). The registry aggregates these into type lookups
 * and the `create_chart` discriminated union.
 */
export const families: readonly ChartFamily[] = [
  cartesianFamily,
  rangeFamily,
  namedFamily,
  xyzFamily,
  financialFamily,
  flagsFamily,
  heatmapGridFamily,
  hierarchicalFamily,
  nodeLinkFamily,
  gaugeFamily,
  statisticalFamily,
  distributionFamily,
  xrangeFamily,
  mapsFamily,
  ganttFamily,
];
