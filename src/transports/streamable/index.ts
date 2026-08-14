import { createServer } from 'node:http';
import type { ServerFactory } from '../index.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/index.js';
import { createRequestHandler } from './handlers.js';
import { createSessionManager } from './sessionManager.js';

export async function startHttpTransport(createMcpServer: ServerFactory): Promise<void> {
  const sessions = createSessionManager(createMcpServer);
  const httpServer = createServer(createRequestHandler(sessions));

  await new Promise<void>((resolve) => {
    httpServer.listen(config.PORT, () => {
      logger.info('HTTP server listening', { port: config.PORT });
      resolve();
    });
  });

  const closeHttp = (): void => {
    void sessions.closeAll().finally(() => httpServer.close());
  };
  process.on('SIGINT', closeHttp);
  process.on('SIGTERM', closeHttp);
}
