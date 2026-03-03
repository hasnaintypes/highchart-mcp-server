import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from './config/index.js';

export const mcpServer = new McpServer({
  name: config.SERVER_NAME,
  version: config.SERVER_VERSION,
});
