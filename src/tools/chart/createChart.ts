import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateChartInputSchema } from '../../types/index.js';
import { logger, jsonResult, handleToolError } from '../../utils/index.js';
import { buildHighchartsConfig } from '../../services/index.js';

export function registerCreateChartTool(server: McpServer): void {
  server.registerTool(
    'create_chart',
    {
      description:
        'Generate a Highcharts configuration object from structured input. Returns valid Highcharts JSON that can be rendered in any Highcharts-compatible environment.',
      inputSchema: CreateChartInputSchema,
    },
    async (args) => handleToolError('create_chart', async () => {
      logger.info('Creating chart', { type: args.type, title: args.title });
      const highchartsConfig = buildHighchartsConfig(args);
      return jsonResult(highchartsConfig);
    }),
  );
}
