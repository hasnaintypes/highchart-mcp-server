import { z } from 'zod/v4';
import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Node-link/relationship series (sankey, dependencywheel, networkgraph,
 * organization, arcdiagram). Data points are links `{ from, to, weight? }`;
 * optional `nodes` can be supplied at the series level (passed through).
 */
export const nodeLinkFamily: ChartFamily = seriesFamily({
  id: 'nodeLink',
  memberTypes: ['sankey', 'dependencywheel', 'networkgraph', 'organization', 'arcdiagram'],
  allowCategories: false,
  dataItem: z.union([
    z.object({
      from: z.string({ error: 'link.from must be a node id string' }),
      to: z.string({ error: 'link.to must be a node id string' }),
      weight: z.number().optional(),
    }).passthrough(),
    z.tuple([z.string(), z.string()]),
    z.tuple([z.string(), z.string(), z.number()]),
  ]),
  description:
    'Relationship charts (sankey, dependency wheel, network graph, organization, arc diagram) built from from/to links.',
  dataShapeHint:
    'series: Array<{ name?: string; nodes?: object[]; data: Array<{ from: string; to: string; weight?: number } | [from, to] | [from, to, weight]> }>',
  example: {
    type: 'sankey',
    title: 'Energy Flow',
    series: [
      {
        name: 'Flow',
        data: [
          { from: 'Coal', to: 'Electricity', weight: 20 },
          { from: 'Gas', to: 'Electricity', weight: 15 },
          { from: 'Electricity', to: 'Homes', weight: 25 },
        ],
      },
    ],
  },
});
