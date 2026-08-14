import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config/index.js';
import { startStdioTransport } from './stdio/index.js';
import { startHttpTransport } from './streamable/index.js';

/** Factory that produces a fresh, tool-registered MCP server instance. */
export type ServerFactory = () => McpServer;

export async function startTransport(createServer: ServerFactory): Promise<void> {
  switch (config.TRANSPORT) {
    case 'stdio':
      await startStdioTransport(createServer);
      break;
    case 'http':
      await startHttpTransport(createServer);
      break;
    default: {
      const _exhaustive: never = config.TRANSPORT;
      throw new Error(`Unknown transport: ${String(_exhaustive)}`);
    }
  }
}
