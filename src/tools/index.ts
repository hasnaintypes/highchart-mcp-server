import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerCreateChartTool,
  registerRenderChartTool,
  registerExportChartTool,
  registerListChartTypesTool,
} from './chart/index.js';

export function registerAllTools(server: McpServer): void {
  registerCreateChartTool(server);
  registerRenderChartTool(server);
  registerExportChartTool(server);
  registerListChartTypesTool(server);
}
