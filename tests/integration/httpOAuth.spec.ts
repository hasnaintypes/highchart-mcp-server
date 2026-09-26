import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { SessionManager } from '../../src/transports/streamable/sessionManager.js';

// Configure oauth BEFORE importing the handler (config is frozen at load).
// Vitest isolates modules per file.
process.env['AUTH_STRATEGY'] = 'oauth';
process.env['PUBLIC_URL'] = 'http://localhost:3000';
process.env['GITHUB_CLIENT_ID'] = 'test-client-id';
process.env['GITHUB_CLIENT_SECRET'] = 'test-client-secret';

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

/** Drives GET /authorize through to the pending-auth id GitHub would echo back as `state`. */
async function startAuthorize(
  clientId: string,
  redirectUri: string,
  extra: Record<string, string> = {},
): Promise<{ verifier: string; pendingState: string }> {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...extra,
  });
  const res = await call(`/authorize?${query.toString()}`, 'GET');
  expect(res.status).toBe(302);
  const location = new URL(res.headers!['Location']!);
  expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize');
  const pendingState = location.searchParams.get('state')!;
  expect(pendingState).toBeTruthy();
  return { verifier, pendingState };
}

function mockGithubFetch(user: { login: string; id: number }, orgs: string[] = []): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = input.toString();
      if (url.startsWith('https://github.com/login/oauth/access_token')) {
        return new Response(JSON.stringify({ access_token: 'gh-access-token' }), { status: 200 });
      }
      if (url.startsWith('https://api.github.com/user/orgs')) {
        return new Response(JSON.stringify(orgs.map((login) => ({ login }))), { status: 200 });
      }
      if (url.startsWith('https://api.github.com/user')) {
        return new Response(JSON.stringify(user), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

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

  it('redirects /authorize to GitHub', async () => {
    const { clientId, redirectUri } = await registerClient();
    const { pendingState } = await startAuthorize(clientId, redirectUri, { state: 'xyz' });
    expect(pendingState).toBeTruthy();
  });

  it('completes the full DCR + GitHub callback + PKCE flow and can call /mcp', async () => {
    const { clientId, redirectUri } = await registerClient();
    const { verifier, pendingState } = await startAuthorize(clientId, redirectUri, { state: 'xyz' });

    mockGithubFetch({ login: 'octocat', id: 1 });

    const callbackRes = await call(
      `/oauth/github/callback?${new URLSearchParams({ code: 'gh-code', state: pendingState }).toString()}`,
      'GET',
    );
    expect(callbackRes.status).toBe(302);
    const location = new URL(callbackRes.headers!['Location']!);
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
    const { pendingState } = await startAuthorize(clientId, redirectUri);
    mockGithubFetch({ login: 'octocat', id: 1 });

    const callbackRes = await call(
      `/oauth/github/callback?${new URLSearchParams({ code: 'gh-code', state: pendingState }).toString()}`,
      'GET',
    );
    const code = new URL(callbackRes.headers!['Location']!).searchParams.get('code')!;

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

  it('reuses of the pending GitHub state are rejected', async () => {
    const { clientId, redirectUri } = await registerClient();
    const { pendingState } = await startAuthorize(clientId, redirectUri);
    mockGithubFetch({ login: 'octocat', id: 1 });

    const first = await call(
      `/oauth/github/callback?${new URLSearchParams({ code: 'gh-code', state: pendingState }).toString()}`,
      'GET',
    );
    expect(first.status).toBe(302);

    const second = await call(
      `/oauth/github/callback?${new URLSearchParams({ code: 'gh-code', state: pendingState }).toString()}`,
      'GET',
    );
    expect(second.status).toBe(400);
  });
});

describe('OAuth authorization server with a GitHub allowlist', () => {
  it('rejects a GitHub user not on the allowlist', async () => {
    process.env['GITHUB_ALLOWED_USERS'] = 'someone-else';
    vi.resetModules();
    const { createRequestHandler: createHandlerWithAllowlist } = await import(
      '../../src/transports/streamable/handlers.js'
    );
    const allowlistedHandler = createHandlerWithAllowlist(fakeSessions);
    const callWithHandler = (url: string, method: string, headers: Record<string, string> = {}, body?: string) => {
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
      allowlistedHandler(req, res as unknown as ServerResponse);
      return res.done.then(() => res);
    };

    const registerRes = await callWithHandler(
      '/register',
      'POST',
      { 'content-type': 'application/json' },
      JSON.stringify({ redirect_uris: ['https://client.example/callback'] }),
    );
    const { client_id: clientId } = JSON.parse(registerRes.body!) as { client_id: string };
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash('sha256').update(verifier).digest());
    const authorizeRes = await callWithHandler(
      `/authorize?${new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'https://client.example/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString()}`,
      'GET',
    );
    const pendingState = new URL(authorizeRes.headers!['Location']!).searchParams.get('state')!;

    mockGithubFetch({ login: 'octocat', id: 1 });
    const callbackRes = await callWithHandler(
      `/oauth/github/callback?${new URLSearchParams({ code: 'gh-code', state: pendingState }).toString()}`,
      'GET',
    );
    expect(callbackRes.status).toBe(403);

    delete process.env['GITHUB_ALLOWED_USERS'];
  });
});
