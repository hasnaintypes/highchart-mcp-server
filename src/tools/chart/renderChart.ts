import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RenderChartInputSchema } from '../../types/index.js';
import { logger, jsonResult, handleToolError } from '../../utils/index.js';

export function registerRenderChartTool(server: McpServer): void {
  server.registerTool(
    'render_chart',
    {
      description:
        'Render a chart from a full Highcharts configuration object. Accepts any valid Highcharts Options — the server validates structure (chart.type, series) but passes all other options through to Highcharts.',
      inputSchema: RenderChartInputSchema,
    },
    async (args) => handleToolError('render_chart', async () => {
      logger.info('Rendering chart', { type: args.chartOptions.chart.type });
      return jsonResult(args.chartOptions);
    }),
  );
}
