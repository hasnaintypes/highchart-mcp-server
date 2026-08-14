import { config } from './config/index.js';
import { logger, getErrorMessage } from './utils/index.js';
import { createMcpServer } from './server.js';
import { startTransport } from './transports/index.js';
import { initExportService, shutdownExportService } from './services/index.js';
import { snapshot } from './metrics/index.js';

async function main(): Promise<void> {
  logger.info('Starting Highchart MCP Server', {
    transport: config.TRANSPORT,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
  });

  await initExportService();

  await startTransport(createMcpServer);

  let metricsTimer: NodeJS.Timeout | undefined;
  if (config.METRICS_ENABLED && config.METRICS_LOG_INTERVAL_MS > 0) {
    metricsTimer = setInterval(() => {
      logger.info('Metrics snapshot', snapshot());
    }, config.METRICS_LOG_INTERVAL_MS);
    metricsTimer.unref();
  }

  const shutdown = (): void => {
    if (metricsTimer !== undefined) clearInterval(metricsTimer);
    void shutdownExportService().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Highchart MCP Server started successfully');
}

main().catch((error: unknown) => {
  logger.error('Fatal error', { error: getErrorMessage(error) });
  process.exit(1);
});
