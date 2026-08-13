import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ExportChartInputSchema } from '../../types/index.js';
import { logger, chartRenderResult, handleToolError } from '../../utils/index.js';
import { exportChart } from '../../services/index.js';

export function registerExportChartTool(server: McpServer): void {
  server.registerTool(
    'export_chart',
    {
      description:
        'Export a chart to SVG, PNG, or PDF from a full Highcharts configuration object. Accepts optional width, height, and scale overrides. Returns both the config JSON and the rendered output.',
      inputSchema: ExportChartInputSchema,
    },
    async (args) => handleToolError('export_chart', async () => {
      logger.info('Exporting chart', {
        type: args.chartOptions.chart.type,
        format: args.format,
      });
      const result = await exportChart(
        args.chartOptions as Record<string, unknown>,
        args.format,
        {
          ...(args.constr !== undefined && { constr: args.constr }),
          width: args.width,
          height: args.height,
          scale: args.scale,
        },
      );
      return chartRenderResult({
        config: args.chartOptions,
        format: result.format,
        data: result.data,
      });
    }),
  );
}
