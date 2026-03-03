import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { createRequestHandler } from './handlers.js';

export async function startHttpTransport(server: McpServer): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const httpServer = createServer(createRequestHandler(transport));

  await server.connect(transport);
  logger.info('Streamable HTTP transport connected');

  await new Promise<void>((resolve) => {
    httpServer.listen(config.PORT, () => {
      logger.info('HTTP server listening', { port: config.PORT });
      resolve();
    });
  });
}
