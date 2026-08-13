import { z } from 'zod/v4';
import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Time-span series (xrange, timeline). Data points are `{ x, x2, y, name? }`
 * describing a horizontal span at row `y`.
 */
export const xrangeFamily: ChartFamily = seriesFamily({
  id: 'xrange',
  memberTypes: ['xrange', 'timeline'],
  allowCategories: true,
  dataItem: z.object({
    x: z.number().optional(),
    x2: z.number().optional(),
    y: z.number().optional(),
    name: z.string().optional(),
  }).passthrough(),
  description: 'Span/timeline charts (xrange, timeline) where each point covers a range on the x axis.',
  dataShapeHint: 'series: Array<{ name?: string; data: Array<{ x: number; x2: number; y: number; name? }> }>',
  example: {
    type: 'xrange',
    title: 'Project Phases',
    xAxisCategories: ['Design', 'Build', 'Ship'],
    series: [
      {
        name: 'Phases',
        data: [
          { x: 0, x2: 5, y: 0 },
          { x: 5, x2: 12, y: 1 },
          { x: 12, x2: 15, y: 2 },
        ],
      },
    ],
  },
});
