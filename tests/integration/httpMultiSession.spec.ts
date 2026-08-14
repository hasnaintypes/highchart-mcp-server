import { describe, it, expect, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod/v4';
import { createRequestHandler } from '../../src/transports/streamable/handlers.js';
import { createSessionManager } from '../../src/transports/streamable/sessionManager.js';

// A minimal server factory (no export service needed for tool listing).
function createTestServer(): McpServer {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  server.registerTool(
    'ping',
    { description: 'ping', inputSchema: z.object({}).shape },
    async () => ({ content: [{ type: 'text', text: 'pong' }] }),
  );
  return server;
}

const sessions = createSessionManager(createTestServer);
const httpServer: Server = createServer(createRequestHandler(sessions));

async function listen(): Promise<number> {
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
  const addr = httpServer.address();
  return typeof addr === 'object' && addr ? addr.port : 0;
}

const clients: Client[] = [];

afterAll(async () => {
  await Promise.all(clients.map((c) => c.close().catch(() => undefined)));
  await sessions.closeAll();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

async function connectClient(port: number): Promise<Client> {
  const client = new Client({ name: 'c', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
  await client.connect(transport);
  clients.push(client);
  return client;
}

describe('HTTP multi-session', () => {
  it('supports two concurrent clients with isolated sessions', async () => {
    const port = await listen();

    const c1 = await connectClient(port);
    const c2 = await connectClient(port);

    const [t1, t2] = await Promise.all([c1.listTools(), c2.listTools()]);
    expect(t1.tools.map((t) => t.name)).toContain('ping');
    expect(t2.tools.map((t) => t.name)).toContain('ping');

    // Two distinct sessions should be tracked concurrently.
    expect(sessions.count()).toBe(2);
  });
});
