import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config/index.js';
import { startStdioTransport } from './stdio/index.js';
import { startHttpTransport } from './streamable/index.js';

export async function startTransport(server: McpServer): Promise<void> {
  switch (config.TRANSPORT) {
    case 'stdio':
      await startStdioTransport(server);
      break;
    case 'http':
      await startHttpTransport(server);
      break;
    default: {
      const _exhaustive: never = config.TRANSPORT;
      throw new Error(`Unknown transport: ${String(_exhaustive)}`);
    }
  }
}
