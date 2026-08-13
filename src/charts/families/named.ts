import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { seriesFamily, enable3d } from '../shared.js';

/**
 * Category/named series where each point is a `{ name, y }` pair (pie, funnel,
 * pyramid, item, wordcloud, variablepie). No cartesian axes are emitted.
 * `wordcloud` uses `{ name, weight }`; `variablepie` uses `{ name, y, z }`.
 */
export const namedFamily: ChartFamily = seriesFamily({
  id: 'named',
  memberTypes: [
    'pie',
    'variablepie',
    'funnel',
    'funnel3d',
    'pyramid',
    'pyramid3d',
    'item',
    'wordcloud',
  ],
  allowCategories: false,
  description:
    'Proportional/named charts (pie, funnel, pyramid, item, wordcloud) where each point is a named value.',
  dataShapeHint:
    'series: Array<{ name?: string; data: Array<{ name: string; y?: number; z?: number; weight?: number }> }>',
  example: {
    type: 'pie',
    title: 'Market Share',
    series: [
      {
        name: 'Share',
        data: [
          { name: 'Chrome', y: 63 },
          { name: 'Safari', y: 20 },
          { name: 'Edge', y: 5 },
        ],
      },
    ],
  },
  decorate: (input: ChartFamilyInput, config) => {
    if (input.type.endsWith('3d')) enable3d(config);
  },
});
