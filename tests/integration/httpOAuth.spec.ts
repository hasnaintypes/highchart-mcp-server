import { describe, it, expect } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { SessionManager } from '../../src/transports/streamable/sessionManager.js';

// Configure oauth BEFORE importing the handler (config is frozen at load).
// Vitest isolates modules per file.
process.env['AUTH_STRATEGY'] = 'oauth';
process.env['PUBLIC_URL'] = 'http://localhost:3000';
process.env['API_KEYS'] = 'demo:demo-secret:charts:render';

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

const fakeSessions: SessionManager = {
  async handle(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  },
  async closeAll(): Promise<void> {},
  count: () => 0,
};

const handler = createRequestHandler(fakeSessions);

function call(
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<MockRes> {
  const res = mockRes();
  const chunks = body === undefined ? [] : [Buffer.from(body)];
  const req = {
    url,
    method,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  } as unknown as IncomingMessage;
  handler(req, res as unknown as ServerResponse);
  return res.done.then(() => res);
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

async function registerClient(): Promise<{ clientId: string; redirectUri: string }> {
  const redirectUri = 'https://client.example/callback';
  const res = await call(
    '/register',
    'POST',
    { 'content-type': 'application/json' },
    JSON.stringify({ redirect_uris: [redirectUri], client_name: 'Test Connector' }),
  );
  expect(res.status).toBe(201);
  const body = JSON.parse(res.body!) as { client_id: string };
  return { clientId: body.client_id, redirectUri };
}

describe('OAuth authorization server', () => {
  it('serves protected-resource and authorization-server metadata', async () => {
    const rs = await call('/.well-known/oauth-protected-resource', 'GET');
    expect(rs.status).toBe(200);
    const rsBody = JSON.parse(rs.body!) as { resource: string; authorization_servers: string[] };
    expect(rsBody.resource).toBe('http://localhost:3000/mcp');
    expect(rsBody.authorization_servers).toEqual(['http://localhost:3000']);

    const as = await call('/.well-known/oauth-authorization-server', 'GET');
    expect(as.status).toBe(200);
    const asBody = JSON.parse(as.body!) as { authorization_endpoint: string; token_endpoint: string };
    expect(asBody.authorization_endpoint).toBe('http://localhost:3000/authorize');
    expect(asBody.token_endpoint).toBe('http://localhost:3000/token');
  });

  it('rejects /mcp without a token with a resource_metadata WWW-Authenticate header', async () => {
    const res = await call('/mcp', 'POST', { 'content-length': '10' });
    expect(res.status).toBe(401);
    expect(res.headers?.['WWW-Authenticate']).toContain('resource_metadata=');
    expect(res.headers?.['WWW-Authenticate']).toContain('/.well-known/oauth-protected-resource');
  });

  it('completes the full DCR + authorization-code + PKCE flow and can call /mcp', async () => {
    const { clientId, redirectUri } = await registerClient();

    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());

    const authorizeQuery = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
    });

    const form = await call(`/authorize?${authorizeQuery.toString()}`, 'GET');
    expect(form.status).toBe(200);
    expect(form.body).toContain('<form');

    const loginBody = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: 'xyz',
      key_id: 'demo',
      api_key: 'demo-secret',
    }).toString();

    const loginRes = await call('/authorize', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, loginBody);
    expect(loginRes.status).toBe(302);
    const location = new URL(loginRes.headers!['Location']!);
    expect(location.origin + location.pathname).toBe(redirectUri);
    expect(location.searchParams.get('state')).toBe('xyz');
    const code = location.searchParams.get('code')!;
    expect(code).toBeTruthy();

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }).toString();

    const tokenRes = await call('/token', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, tokenBody);
    expect(tokenRes.status).toBe(200);
    const tokenJson = JSON.parse(tokenRes.body!) as { access_token: string; refresh_token: string };
    expect(tokenJson.access_token).toBeTruthy();

    const mcpRes = await call('/mcp', 'POST', {
      authorization: `Bearer ${tokenJson.access_token}`,
      'content-length': '10',
    });
    expect(mcpRes.status).toBe(200);

    // The code is single-use.
    const reuseRes = await call('/token', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, tokenBody);
    expect(reuseRes.status).toBe(400);
    expect(JSON.parse(reuseRes.body!).error).toBe('invalid_grant');
  });

  it('rejects a token exchange with the wrong code_verifier', async () => {
    const { clientId, redirectUri } = await registerClient();
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());

    const loginBody = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      key_id: 'demo',
      api_key: 'demo-secret',
    }).toString();
    const loginRes = await call('/authorize', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, loginBody);
    const code = new URL(loginRes.headers!['Location']!).searchParams.get('code')!;

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: 'not-the-right-verifier',
    }).toString();
    const tokenRes = await call('/token', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, tokenBody);
    expect(tokenRes.status).toBe(400);
    expect(JSON.parse(tokenRes.body!).error).toBe('invalid_grant');
  });

  it('rejects login with an invalid API key', async () => {
    const { clientId, redirectUri } = await registerClient();
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const loginBody = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      key_id: 'demo',
      api_key: 'wrong-secret',
    }).toString();
    const res = await call('/authorize', 'POST', { 'content-type': 'application/x-www-form-urlencoded' }, loginBody);
    expect(res.status).toBe(401);
    expect(res.body).toContain('Invalid key ID or API key');
  });
});
