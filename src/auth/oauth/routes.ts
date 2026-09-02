import type { IncomingMessage, ServerResponse } from 'node:http';
import { signJwtHs256 } from '../jwt.js';
import { safeEqual, parseApiKeys } from '../apiKey.js';
import { verifyPkce } from './pkce.js';
import type { OAuthStore } from './store.js';
import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from './metadata.js';

const MAX_BODY_BYTES = 65_536;

export interface OAuthRoutesOptions {
  store: OAuthStore;
  publicUrl: string;
  secret: string;
  apiKeys: string | undefined;
  accessTokenTtlMs: number;
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function oauthError(res: ServerResponse, status: number, error: string, description?: string): void {
  sendJson(res, status, description === undefined ? { error } : { error, error_description: description });
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseFormOrJson(contentType: string | undefined, raw: string): Record<string, string> {
  if (contentType !== undefined && contentType.includes('application/json')) {
    const parsed: unknown = raw.length > 0 ? JSON.parse(raw) : {};
    const out: Record<string, string> = {};
    if (parsed !== null && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
        else if (Array.isArray(v)) out[k] = v.map(String).join(' ');
      }
    }
    return out;
  }
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) out[k] = v;
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLoginForm(params: Record<string, string>, error?: string): string {
  const hidden = ['client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'resource']
    .filter((key) => params[key] !== undefined)
    .map((key) => `<input type="hidden" name="${key}" value="${escapeHtml(params[key]!)}">`)
    .join('\n      ');
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Sign in</title></head>
  <body>
    <h1>Sign in to authorize this connector</h1>
    ${error !== undefined ? `<p style="color:red">${escapeHtml(error)}</p>` : ''}
    <form method="POST" action="/authorize">
      ${hidden}
      <label>Key ID: <input type="text" name="key_id" autocomplete="username"></label><br>
      <label>API Key: <input type="password" name="api_key" autocomplete="current-password"></label><br>
      <button type="submit">Authorize</button>
    </form>
  </body>
</html>`;
}

/** Validates client_id + redirect_uri against the registry; returns the client on success. */
function validateClientRedirect(
  store: OAuthStore,
  clientId: string | undefined,
  redirectUri: string | undefined,
): { ok: true } | { ok: false; message: string } {
  if (clientId === undefined || redirectUri === undefined) {
    return { ok: false, message: 'Missing client_id or redirect_uri' };
  }
  const client = store.getClient(clientId);
  if (client === undefined) return { ok: false, message: 'Unknown client_id' };
  if (!client.redirectUris.includes(redirectUri)) return { ok: false, message: 'redirect_uri mismatch' };
  return { ok: true };
}

export function createOAuthRoutes(options: OAuthRoutesOptions): {
  protectedResourceMetadata(req: IncomingMessage, res: ServerResponse): void;
  authorizationServerMetadata(req: IncomingMessage, res: ServerResponse): void;
  register(req: IncomingMessage, res: ServerResponse): Promise<void>;
  authorizeGet(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): void;
  authorizePost(req: IncomingMessage, res: ServerResponse): Promise<void>;
  token(req: IncomingMessage, res: ServerResponse): Promise<void>;
} {
  const { store, publicUrl, secret, apiKeys, accessTokenTtlMs } = options;
  const canonicalResource = `${publicUrl}/mcp`;
  const loginEntries = parseApiKeys(apiKeys);

  function issueTokenResponse(res: ServerResponse, subject: string, scopes: string[], clientId: string): void {
    const now = Math.floor(Date.now() / 1000);
    const accessToken = signJwtHs256(
      {
        sub: subject,
        iss: publicUrl,
        aud: canonicalResource,
        scope: scopes.join(' '),
        iat: now,
        exp: now + Math.floor(accessTokenTtlMs / 1000),
      },
      secret,
    );
    const refreshToken = store.createRefreshToken({ clientId, subject, scopes });
    sendJson(res, 200, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor(accessTokenTtlMs / 1000),
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    });
  }

  return {
    protectedResourceMetadata(_req, res) {
      sendJson(res, 200, buildProtectedResourceMetadata(publicUrl));
    },

    authorizationServerMetadata(_req, res) {
      sendJson(res, 200, buildAuthorizationServerMetadata(publicUrl));
    },

    async register(req, res) {
      let body: Record<string, string>;
      let redirectUris: unknown;
      try {
        const raw = await readBody(req);
        const parsed: unknown = raw.length > 0 ? JSON.parse(raw) : {};
        body = parsed as Record<string, string>;
        redirectUris = (parsed as { redirect_uris?: unknown }).redirect_uris;
      } catch {
        oauthError(res, 400, 'invalid_client_metadata', 'Malformed JSON body');
        return;
      }
      if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === 'string')) {
        oauthError(res, 400, 'invalid_client_metadata', 'redirect_uris must be a non-empty array of strings');
        return;
      }
      const clientName = typeof body['client_name'] === 'string' ? body['client_name'] : undefined;
      const client = store.registerClient(redirectUris as string[], clientName);
      sendJson(res, 201, {
        client_id: client.clientId,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        ...(clientName !== undefined ? { client_name: clientName } : {}),
      });
    },

    authorizeGet(_req, res, query) {
      const params: Record<string, string> = {};
      for (const [k, v] of query) params[k] = v;

      if (params['response_type'] !== 'code') {
        oauthError(res, 400, 'unsupported_response_type');
        return;
      }
      const check = validateClientRedirect(store, params['client_id'], params['redirect_uri']);
      if (!check.ok) {
        oauthError(res, 400, 'invalid_request', check.message);
        return;
      }
      if (params['code_challenge_method'] !== 'S256' || !params['code_challenge']) {
        oauthError(res, 400, 'invalid_request', 'PKCE (S256) code_challenge is required');
        return;
      }
      sendHtml(res, 200, renderLoginForm(params));
    },

    async authorizePost(req, res) {
      let params: Record<string, string>;
      try {
        const raw = await readBody(req);
        params = parseFormOrJson(req.headers['content-type'], raw);
      } catch {
        oauthError(res, 400, 'invalid_request', 'Malformed request body');
        return;
      }

      const check = validateClientRedirect(store, params['client_id'], params['redirect_uri']);
      if (!check.ok) {
        oauthError(res, 400, 'invalid_request', check.message);
        return;
      }
      const codeChallenge = params['code_challenge'];
      if (params['code_challenge_method'] !== 'S256' || !codeChallenge) {
        oauthError(res, 400, 'invalid_request', 'PKCE (S256) code_challenge is required');
        return;
      }

      const keyId = params['key_id'] ?? '';
      const apiKey = params['api_key'] ?? '';
      const match = loginEntries.find((e) => safeEqual(e.id, keyId) && safeEqual(e.key, apiKey));
      if (match === undefined) {
        sendHtml(res, 401, renderLoginForm(params, 'Invalid key ID or API key'));
        return;
      }

      const resource = params['resource'];
      if (resource !== undefined && resource !== canonicalResource) {
        oauthError(res, 400, 'invalid_target', 'Unknown resource');
        return;
      }

      const code = store.createAuthCode({
        clientId: params['client_id']!,
        redirectUri: params['redirect_uri']!,
        codeChallenge,
        subject: match.id,
        scopes: match.scopes,
      });

      const redirectUrl = new URL(params['redirect_uri']!);
      redirectUrl.searchParams.set('code', code);
      if (params['state'] !== undefined) redirectUrl.searchParams.set('state', params['state']);
      res.writeHead(302, { Location: redirectUrl.toString() });
      res.end();
    },

    async token(req, res) {
      let params: Record<string, string>;
      try {
        const raw = await readBody(req);
        params = parseFormOrJson(req.headers['content-type'], raw);
      } catch {
        oauthError(res, 400, 'invalid_request', 'Malformed request body');
        return;
      }

      const grantType = params['grant_type'];

      if (grantType === 'authorization_code') {
        const code = params['code'];
        if (code === undefined) {
          oauthError(res, 400, 'invalid_request', 'Missing code');
          return;
        }
        const entry = store.consumeAuthCode(code);
        if (entry === undefined) {
          oauthError(res, 400, 'invalid_grant', 'Unknown or expired code');
          return;
        }
        if (entry.clientId !== params['client_id'] || entry.redirectUri !== params['redirect_uri']) {
          oauthError(res, 400, 'invalid_grant', 'client_id/redirect_uri mismatch');
          return;
        }
        const verifier = params['code_verifier'];
        if (verifier === undefined || !verifyPkce(verifier, entry.codeChallenge, 'S256')) {
          oauthError(res, 400, 'invalid_grant', 'PKCE verification failed');
          return;
        }
        const resource = params['resource'];
        if (resource !== undefined && resource !== canonicalResource) {
          oauthError(res, 400, 'invalid_target', 'Unknown resource');
          return;
        }
        issueTokenResponse(res, entry.subject, entry.scopes, entry.clientId);
        return;
      }

      if (grantType === 'refresh_token') {
        const refreshToken = params['refresh_token'];
        if (refreshToken === undefined) {
          oauthError(res, 400, 'invalid_request', 'Missing refresh_token');
          return;
        }
        const entry = store.consumeRefreshToken(refreshToken);
        if (entry === undefined) {
          oauthError(res, 400, 'invalid_grant', 'Unknown or expired refresh_token');
          return;
        }
        issueTokenResponse(res, entry.subject, entry.scopes, entry.clientId);
        return;
      }

      oauthError(res, 400, 'unsupported_grant_type');
    },
  };
}
