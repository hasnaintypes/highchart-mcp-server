import { describe, it, expect } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRequestHandler } from '../../src/transports/streamable/handlers.js';
import { incr } from '../../src/metrics/index.js';

interface MockRes {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (status: number, headers?: Record<string, string>) => MockRes;
  end: (body?: string) => void;
  headersSent: boolean;
}

function mockRes(): MockRes {
  const res: MockRes = {
    headersSent: false,
    writeHead(status, headers) {
      res.status = status;
      res.headers = headers;
      res.headersSent = true;
      return res;
    },
    end(body) {
      res.body = body;
    },
  };
  return res;
}

// The health/metrics routes never touch the transport.
const dummyTransport = {} as StreamableHTTPServerTransport;
const handler = createRequestHandler(dummyTransport);

function call(url: string, method = 'GET'): MockRes {
  const res = mockRes();
  handler({ url, method } as IncomingMessage, res as unknown as ServerResponse);
  return res;
}

describe('HTTP endpoints', () => {
  it('GET /health returns status, version and uptime', () => {
    const res = call('/health');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body ?? '{}');
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('GET /metrics returns Prometheus text with recorded metrics', () => {
    incr('highchart_tool_invocations_total', { tool: 'create_chart', status: 'ok' });
    const res = call('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers?.['Content-Type']).toContain('text/plain');
    expect(res.body).toContain('highchart_tool_invocations_total');
    expect(res.body).toContain('# TYPE');
  });

  it('unknown route returns 404', () => {
    const res = call('/nope');
    expect(res.status).toBe(404);
  });
});
