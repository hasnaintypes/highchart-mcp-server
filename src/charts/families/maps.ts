import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { titleShape } from '../shared.js';

/**
 * Map series rendered with the `mapChart` constructor. The caller supplies the
 * map `topology` (GeoJSON or TopoJSON); this server does not bundle or fetch map
 * collections. Point shapes vary by type:
 *
 * - map / geoheatmap: `{ 'hc-key' | code, value }` (choropleth)
 * - mappoint / mapbubble: `{ lat, lon, name?, z? }`
 * - mapline: line features
 * - flowmap: `{ from, to, weight? }`
 * - tiledwebmap: no data — provide `provider`
 */
const COLOR_AXIS_TYPES = new Set(['map', 'geoheatmap', 'mapbubble']);

const inputSchema = z.object({
  ...titleShape,
  topology: z.record(z.string(), z.unknown()).optional(),
  joinBy: z.union([z.string(), z.tuple([z.string(), z.string()])]).optional(),
  provider: z.record(z.string(), z.unknown()).optional(),
  data: z
    .array(z.union([z.number(), z.array(z.number()), z.record(z.string(), z.unknown())]))
    .optional(),
  series: z.array(z.record(z.string(), z.unknown())).optional(),
});

type MapsInput = ChartFamilyInput & z.infer<typeof inputSchema>;

export const mapsFamily: ChartFamily = {
  id: 'maps',
  memberTypes: ['map', 'mapline', 'mappoint', 'mapbubble', 'geoheatmap', 'tiledwebmap', 'flowmap'],
  constr: 'mapChart',
  inputSchema,
  needsColorAxis: true,
  description:
    'Map charts (choropleth, mapline, mappoint, mapbubble, geoheatmap, tiledwebmap, flowmap) rendered with the mapChart constructor. Caller supplies GeoJSON/TopoJSON topology.',
  dataShapeHint:
    '{ topology: GeoJSON|TopoJSON, joinBy?, data: Array<{ code, value } | { lat, lon } | { from, to, weight }> }  // tiledwebmap uses provider instead of data',
  example: {
    type: 'map',
    title: 'Population',
    topology: { type: 'FeatureCollection', features: [] },
    joinBy: 'hc-key',
    data: [
      { 'hc-key': 'us-ca', value: 39 },
      { 'hc-key': 'us-tx', value: 29 },
    ],
  },
  build(input: ChartFamilyInput): Record<string, unknown> {
    const d = input as MapsInput;

    const config: Record<string, unknown> = {
      chart: {
        map: d.topology ?? undefined,
      },
      title: { text: d.title ?? '' },
    };
    if (d.subtitle !== undefined) config['subtitle'] = { text: d.subtitle };
    if (COLOR_AXIS_TYPES.has(input.type)) config['colorAxis'] = {};

    if (d.series !== undefined) {
      config['series'] = d.series;
    } else {
      const series: Record<string, unknown> = { type: input.type };
      if (d.topology !== undefined) series['mapData'] = d.topology;
      if (d.joinBy !== undefined) series['joinBy'] = d.joinBy;
      if (d.provider !== undefined) series['provider'] = d.provider;
      if (d.data !== undefined) series['data'] = d.data;
      config['series'] = [series];
    }

    return config;
  },
};
