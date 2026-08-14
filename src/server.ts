import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from './config/index.js';
import { registerAllTools } from './tools/index.js';

/**
 * Creates a fresh MCP server instance with all tools registered. A new instance
 * is used per HTTP session (and once for STDIO) so sessions stay isolated — an
 * McpServer can only be bound to a single transport at a time.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: config.SERVER_NAME,
    version: config.SERVER_VERSION,
  });
  registerAllTools(server);
  return server;
}
