import type { ChartFamily } from '../types.js';
import { seriesFamily } from '../shared.js';

/**
 * Financial/OHLC series rendered with the `stockChart` constructor.
 * Data points are `[x, open, high, low, close]` (or `{ x, open, high, low, close }`).
 * `hlc` uses `[x, high, low, close]`. Includes derived stock series
 * (heikinashi, renko, pointandfigure, hollowcandlestick).
 */
export const financialFamily: ChartFamily = seriesFamily({
  id: 'financial',
  constr: 'stockChart',
  memberTypes: [
    'ohlc',
    'hlc',
    'candlestick',
    'hollowcandlestick',
    'heikinashi',
    'renko',
    'pointandfigure',
  ],
  allowCategories: false,
  description:
    'Financial charts (candlestick, OHLC and stock variants) rendered with the stockChart constructor.',
  dataShapeHint:
    'series: Array<{ name?: string; data: Array<[x, open, high, low, close] | { x, open, high, low, close }> }>',
  example: {
    type: 'candlestick',
    title: 'AAPL',
    series: [
      {
        name: 'AAPL',
        data: [
          [1609459200000, 133, 135, 130, 132],
          [1609545600000, 132, 138, 131, 137],
        ],
      },
    ],
  },
  decorate: (_input, config) => {
    config['xAxis'] = { type: 'datetime' };
  },
});
