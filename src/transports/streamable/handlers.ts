import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger, getErrorMessage } from '../../utils/index.js';
import { config } from '../../config/index.js';
import { renderProm, uptimeSeconds } from '../../metrics/index.js';

export function createRequestHandler(
  transport: StreamableHTTPServerTransport,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    const url = req.url ?? '/';

    if (url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          version: config.SERVER_VERSION,
          uptimeSeconds: Math.round(uptimeSeconds()),
        }),
      );
      return;
    }

    if (url === '/metrics' && req.method === 'GET') {
      if (!config.METRICS_ENABLED) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Metrics disabled' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
      res.end(renderProm());
      return;
    }

    if (url === '/mcp') {
      // Reject over-large payloads early (best-effort via Content-Length).
      const contentLength = Number(req.headers['content-length'] ?? 0);
      if (Number.isFinite(contentLength) && contentLength > config.HTTP_MAX_BODY_BYTES) {
        logger.warn('Rejected oversized MCP request', {
          contentLength,
          limit: config.HTTP_MAX_BODY_BYTES,
        });
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        return;
      }

      transport.handleRequest(req, res).catch((error: unknown) => {
        const message = getErrorMessage(error);
        logger.error('Error handling MCP request', { error: message });
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  };
}
