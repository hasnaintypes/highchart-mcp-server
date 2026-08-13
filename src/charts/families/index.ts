import type { ChartFamily } from '../types.js';
import { cartesianFamily } from './cartesian.js';

/**
 * Ordered list of all chart families. New families (2.2/2.3) are appended here.
 * The registry aggregates these into type lookups and the `create_chart`
 * discriminated union.
 */
export const families: readonly ChartFamily[] = [cartesianFamily];
