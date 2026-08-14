import { describe, it, expect } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Configure auth + rate limiting BEFORE importing the handler (config is frozen
// at load). Vitest isolates modules per file.
process.env['AUTH_STRATEGY'] = 'apikey';
process.env['API_KEYS'] = 'client1:secret1:charts:render';
process.env['RATE_LIMIT_ENABLED'] = 'true';
process.env['RATE_LIMIT_RPM'] = '60';
process.env['RATE_LIMIT_BURST'] = '2';

const { createRequestHandler } = await import('../../src/transports/streamable/handlers.js');

interface MockRes {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  done: Promise<void>;
  writeHead: (status: number, headers?: Record<string, string>) => MockRes;
  end: (body?: string) => void;
  headersSent: boolean;
}

function mockRes(): MockRes {
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const res: MockRes = {
    headersSent: false,
    done,
    writeHead(status, headers) {
      res.status = status;
      res.headers = headers;
      res.headersSent = true;
      return res;
    },
    end(body) {
      res.body = body;
      resolve();
    },
  };
  return res;
}

// Fake transport that always succeeds, so we can exercise auth + rate limiting
// without a real MCP session.
const fakeTransport = {
  async handleRequest(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  },
} as unknown as StreamableHTTPServerTransport;

const handler = createRequestHandler(fakeTransport);

function call(url: string, method: string, headers: Record<string, string> = {}): Promise<MockRes> {
  const res = mockRes();
  const req = { url, method, headers, socket: { remoteAddress: '127.0.0.1' } } as unknown as IncomingMessage;
  handler(req, res as unknown as ServerResponse);
  return res.done.then(() => res);
}

const authed = { authorization: 'Bearer secret1', 'content-length': '10' };

describe('HTTP auth + rate limiting', () => {
  it('allows /health without auth', async () => {
    const res = await call('/health', 'GET');
    expect(res.status).toBe(200);
  });

  it('rejects /mcp without a key (401 + WWW-Authenticate)', async () => {
    const res = await call('/mcp', 'POST', { 'content-length': '10' });
    expect(res.status).toBe(401);
    expect(res.headers?.['WWW-Authenticate']).toContain('Bearer');
  });

  it('rejects /mcp with an invalid key (401)', async () => {
    const res = await call('/mcp', 'POST', { authorization: 'Bearer wrong', 'content-length': '10' });
    expect(res.status).toBe(401);
  });

  it('allows valid key up to burst then returns 429', async () => {
    const r1 = await call('/mcp', 'POST', authed);
    const r2 = await call('/mcp', 'POST', authed);
    const r3 = await call('/mcp', 'POST', authed);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
    expect(r3.headers?.['Retry-After']).toBeDefined();
  });
});
