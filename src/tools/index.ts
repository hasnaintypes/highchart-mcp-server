import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateChartTool, registerRenderChartTool } from './chart/index.js';

export function registerAllTools(server: McpServer): void {
  registerCreateChartTool(server);
  registerRenderChartTool(server);
}
