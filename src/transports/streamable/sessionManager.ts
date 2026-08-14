import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerFactory } from '../index.js';
import { config } from '../../config/index.js';
import { logger, getErrorMessage } from '../../utils/index.js';
import { setGauge } from '../../metrics/index.js';

const SESSION_HEADER = 'mcp-session-id';

function getSessionId(req: IncomingMessage): string | undefined {
  const value = req.headers[SESSION_HEADER];
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Manages one MCP server + StreamableHTTP transport per session, keyed by the
 * `mcp-session-id` header. New sessions are created on an initialize POST (no
 * session id); subsequent requests are routed to the matching transport.
 */
export interface SessionManager {
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
  closeAll(): Promise<void>;
  count(): number;
}

export function createSessionManager(createServer: ServerFactory): SessionManager {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  const updateGauge = (): void => {
    setGauge('highchart_active_sessions', sessions.size, undefined, 'Active MCP HTTP sessions.');
  };

  async function createSession(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (sessions.size >= config.HTTP_MAX_SESSIONS) {
      logger.warn('Rejected new session: capacity reached', { max: config.HTTP_MAX_SESSIONS });
      sendJson(res, 503, { error: 'Session capacity reached; try again later' });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        sessions.set(sessionId, transport);
        updateGauge();
        logger.info('MCP session initialized', { sessionId, active: sessions.size });
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid !== undefined && sessions.delete(sid)) {
        updateGauge();
        logger.info('MCP session closed', { sessionId: sid, active: sessions.size });
      }
    };

    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res);
  }

  return {
    async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const sessionId = getSessionId(req);

      if (sessionId !== undefined) {
        const transport = sessions.get(sessionId);
        if (transport === undefined) {
          sendJson(res, 404, { error: 'Unknown or expired session' });
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }

      // No session id: only a POST (initialize) may create a new session.
      if (req.method !== 'POST') {
        sendJson(res, 400, { error: 'Missing mcp-session-id header' });
        return;
      }

      try {
        await createSession(req, res);
      } catch (error) {
        logger.error('Failed to establish MCP session', { error: getErrorMessage(error) });
        sendJson(res, 500, { error: 'Failed to establish session' });
      }
    },

    async closeAll(): Promise<void> {
      const transports = [...sessions.values()];
      sessions.clear();
      updateGauge();
      await Promise.all(
        transports.map((t) =>
          Promise.resolve()
            .then(() => t.close())
            .catch(() => undefined),
        ),
      );
    },

    count(): number {
      return sessions.size;
    },
  };
}
