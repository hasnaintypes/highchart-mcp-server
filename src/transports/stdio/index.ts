import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ServerFactory } from '../index.js';
import { logger } from '../../utils/index.js';

export async function startStdioTransport(createServer: ServerFactory): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  logger.info('Starting STDIO transport');
  await server.connect(transport);
  logger.info('STDIO transport connected');
}
