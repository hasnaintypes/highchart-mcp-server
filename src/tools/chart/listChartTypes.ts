import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { allChartTypes, chartCatalog } from '../../charts/index.js';
import { jsonResult, handleToolError } from '../../utils/index.js';

const ListChartTypesSchema = z.object({
  family: z
    .string()
    .optional()
    .describe('Optional family id to filter by (e.g. "cartesian", "financial", "maps").'),
});

export function registerListChartTypesTool(server: McpServer): void {
  server.registerTool(
    'list_chart_types',
    {
      description:
        'List every supported Highcharts chart type, grouped by family, with the constructor, ' +
        'expected data shape, and a worked example for each. Use this to choose a `type` and shape ' +
        'the `series`/data before calling create_chart.',
      inputSchema: ListChartTypesSchema.shape,
    },
    async (args) => handleToolError('list_chart_types', async () => {
      const all = chartCatalog();
      const families =
        args.family !== undefined
          ? all.filter((f) => f.family === args.family)
          : all;

      return jsonResult({
        totalTypes: allChartTypes().length,
        totalFamilies: all.length,
        families,
      });
    }),
  );
}
