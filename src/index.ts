import { config } from './config/index.js';
import { logger, getErrorMessage } from './utils/index.js';
import { mcpServer } from './server.js';
import { registerAllTools } from './tools/index.js';
import { startTransport } from './transports/index.js';

async function main(): Promise<void> {
  logger.info('Starting Highchart MCP Server', {
    transport: config.TRANSPORT,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
  });

  registerAllTools(mcpServer);
  await startTransport(mcpServer);

  logger.info('Highchart MCP Server started successfully');
}

main().catch((error: unknown) => {
  logger.error('Fatal error', { error: getErrorMessage(error) });
  process.exit(1);
});
