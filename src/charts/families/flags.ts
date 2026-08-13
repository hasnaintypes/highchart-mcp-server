import { z } from 'zod/v4';
import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Flag overlays (news/events on a time axis), rendered with `stockChart`.
 * Data points are `{ x, title, text }`.
 */
export const flagsFamily: ChartFamily = seriesFamily({
  id: 'flags',
  constr: 'stockChart',
  memberTypes: ['flags'],
  allowCategories: false,
  dataItem: z.object({
    x: z.number({ error: 'flags data points require a numeric x (timestamp)' }),
    title: z.string().optional(),
    text: z.string().optional(),
  }).passthrough(),
  description: 'Event flags placed on a datetime axis, rendered with stockChart.',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<{ x: number; title?: string; text?: string }> }>',
  example: {
    type: 'flags',
    title: 'Events',
    series: [
      {
        name: 'Milestones',
        data: [
          { x: 1609459200000, title: 'v1', text: 'Release 1.0' },
          { x: 1612137600000, title: 'v2', text: 'Release 2.0' },
        ],
      },
    ],
  },
  decorate: (_input, config) => {
    config['xAxis'] = { type: 'datetime' };
  },
});
