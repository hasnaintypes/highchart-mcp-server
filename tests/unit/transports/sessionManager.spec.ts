import { describe, it, expect, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSessionManager } from '../../../src/transports/streamable/sessionManager.js';

function mockRes(): { status?: number; body?: string; writeHead: (s: number) => unknown; end: (b?: string) => void; headersSent: boolean } {
  const res = {
    headersSent: false,
    status: undefined as number | undefined,
    body: undefined as string | undefined,
    writeHead(status: number) {
      res.status = status;
      res.headersSent = true;
      return res;
    },
    end(body?: string) {
      res.body = body;
    },
  };
  return res;
}

function req(method: string, headers: Record<string, string> = {}): IncomingMessage {
  return { method, headers } as unknown as IncomingMessage;
}

describe('session manager routing', () => {
  it('returns 404 for an unknown session id (no server created)', async () => {
    const createServer = vi.fn(() => ({}) as McpServer);
    const mgr = createSessionManager(createServer);
    const res = mockRes();

    await mgr.handle(req('POST', { 'mcp-session-id': 'does-not-exist' }), res as unknown as ServerResponse);

    expect(res.status).toBe(404);
    expect(createServer).not.toHaveBeenCalled();
  });

  it('returns 400 for a non-POST without a session id', async () => {
    const mgr = createSessionManager(() => ({}) as McpServer);
    const res = mockRes();

    await mgr.handle(req('GET'), res as unknown as ServerResponse);

    expect(res.status).toBe(400);
  });

  it('starts with zero active sessions', () => {
    const mgr = createSessionManager(() => ({}) as McpServer);
    expect(mgr.count()).toBe(0);
  });
});
