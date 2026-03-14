import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RenderChartInputSchema } from '../../types/index.js';
import { logger, chartRenderResult, handleToolError } from '../../utils/index.js';
import { exportChart } from '../../services/index.js';

export function registerRenderChartTool(server: McpServer): void {
  server.registerTool(
    'render_chart',
    {
      description:
        'Render a chart from a full Highcharts configuration object. Accepts any valid Highcharts Options — the server validates structure (chart.type, series) but passes all other options through to Highcharts. Returns both the config JSON and the rendered output.',
      inputSchema: RenderChartInputSchema,
    },
    async (args) => handleToolError('render_chart', async () => {
      logger.info('Rendering chart', { type: args.chartOptions.chart.type, format: args.format });
      const result = await exportChart(
        args.chartOptions as Record<string, unknown>,
        args.format,
      );
      return chartRenderResult({
        config: args.chartOptions,
        format: result.format,
        data: result.data,
      });
    }),
  );
}
