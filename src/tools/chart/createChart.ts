import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import {
  allChartTypes,
  buildFromInput,
  CreateChartInputSchema,
  type ChartFamilyInput,
} from '../../charts/index.js';
import { logger, jsonResult, chartRenderResult, handleToolError } from '../../utils/index.js';
import { exportChart } from '../../services/index.js';

/**
 * Advertised (JSON-schema) input for `create_chart`. The MCP SDK can only
 * publish a JSON schema for object schemas, so we expose a permissive object
 * (the `type` enum of every supported series type plus the union of family
 * fields) and perform precise, per-type validation inside the handler with the
 * registry's discriminated union.
 */
const chartTypes = allChartTypes() as [string, ...string[]];

const CreateChartToolSchema = z.object({
  type: z.enum(chartTypes, {
    error:
      'Unsupported chart type. Call list_chart_types to see every supported type ' +
      '(e.g. line, bar, pie, area, column, scatter, heatmap, sankey, gauge, treemap, ...).',
  }),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  xAxisCategories: z.array(z.string()).optional(),
  series: z.array(z.record(z.string(), z.unknown())).optional(),
  // Family-specific fields (validated precisely per type in the handler):
  baseData: z.array(z.number()).optional(),
  tasks: z.array(z.record(z.string(), z.unknown())).optional(),
  topology: z.record(z.string(), z.unknown()).optional(),
  joinBy: z.union([z.string(), z.array(z.string())]).optional(),
  provider: z.record(z.string(), z.unknown()).optional(),
  data: z.array(z.unknown()).optional(),
  // Optionally render immediately instead of returning config JSON:
  format: z.enum(['svg', 'png', 'pdf']).optional(),
}).passthrough();

export function registerCreateChartTool(server: McpServer): void {
  server.registerTool(
    'create_chart',
    {
      description:
        'Generate a Highcharts configuration from structured input for any of the supported chart types. ' +
        'Returns Highcharts JSON (plus the constructor to render it with), or the rendered image when `format` is provided. ' +
        'Use list_chart_types to discover every supported type and its expected data shape.',
      inputSchema: CreateChartToolSchema.shape,
    },
    async (args) => handleToolError('create_chart', async () => {
      logger.info('Creating chart', { type: args.type });

      // Precise, per-type validation via the registry discriminated union.
      const parsed = CreateChartInputSchema.parse(args) as ChartFamilyInput;
      const { options, constr } = buildFromInput(parsed);

      const format = args.format;
      if (format !== undefined) {
        const result = await exportChart(options, format, { constr });
        return chartRenderResult({ config: options, format: result.format, data: result.data });
      }

      return jsonResult({ constr, options });
    }),
  );
}
