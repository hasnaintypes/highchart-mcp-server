import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CreateChartInputSchema } from '../../types/index.js';
import type { CreateChartInput, HighchartsConfig } from '../../types/index.js';
import { logger } from '../../utils/index.js';

export function buildHighchartsConfig(input: CreateChartInput): HighchartsConfig {
  const config: HighchartsConfig = {
    chart: { type: input.type },
    title: { text: input.title ?? '' },
    series: input.series.map((s) => ({
      ...(s.name !== undefined ? { name: s.name } : {}),
      data: s.data,
    })),
  };

  if (input.xAxisCategories !== undefined && input.type !== 'pie') {
    config.xAxis = { categories: input.xAxisCategories };
  }

  return config;
}

export function registerCreateChartTool(server: McpServer): void {
  server.registerTool(
    'create_chart',
    {
      description:
        'Generate a Highcharts configuration object from structured input. Returns valid Highcharts JSON that can be rendered in any Highcharts-compatible environment.',
      inputSchema: CreateChartInputSchema,
    },
    async (args) => {
      try {
        logger.info('Creating chart', { type: args.type, title: args.title });
        const highchartsConfig = buildHighchartsConfig(args);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(highchartsConfig, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to create chart', { error: message });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error creating chart: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
