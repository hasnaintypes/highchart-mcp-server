import { z } from 'zod/v4';
import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Hierarchical/tree series (treemap, sunburst, treegraph). Data points are
 * `{ id, parent?, name?, value? }` describing a tree via parent references.
 */
export const hierarchicalFamily: ChartFamily = seriesFamily({
  id: 'hierarchical',
  memberTypes: ['treemap', 'sunburst', 'treegraph'],
  allowCategories: false,
  dataItem: z.object({
    id: z.string().optional(),
    parent: z.string().optional(),
    name: z.string().optional(),
    value: z.number().optional(),
  }).passthrough(),
  description: 'Tree/hierarchy charts (treemap, sunburst, treegraph) built from parent references.',
  dataShapeHint:
    'series: Array<{ name?: string; data: Array<{ id?: string; parent?: string; name?: string; value?: number }> }>',
  example: {
    type: 'treemap',
    title: 'Disk Usage',
    series: [
      {
        name: 'Files',
        data: [
          { id: 'root', name: 'root' },
          { parent: 'root', name: 'src', value: 40 },
          { parent: 'root', name: 'docs', value: 12 },
        ],
      },
    ],
  },
});
