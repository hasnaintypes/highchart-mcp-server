import type { IncomingMessage } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { AuthContext, Authenticator } from './types.js';
import { AuthError } from './types.js';

interface ApiKeyEntry {
  id: string;
  key: string;
  scopes: string[];
}

/**
 * Parses the `API_KEYS` env value. Each entry is either:
 *   - `key`                       (id defaults to 'key-N', no scopes), or
 *   - `id:key`                    (no scopes), or
 *   - `id:key:scope1|scope2`      (with scopes)
 * Entries are comma-separated.
 */
export function parseApiKeys(raw: string | undefined): ApiKeyEntry[] {
  if (raw === undefined) return [];
  const entries: ApiKeyEntry[] = [];
  const parts = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  parts.forEach((part, index) => {
    // Only the first two colons delimit id/key; scope names themselves may
    // contain colons (e.g. "charts:render"), so the remainder is the scope list.
    const firstColon = part.indexOf(':');
    if (firstColon === -1) {
      entries.push({ id: `key-${index + 1}`, key: part, scopes: [] });
      return;
    }
    const id = part.slice(0, firstColon).trim();
    const rest = part.slice(firstColon + 1);
    const secondColon = rest.indexOf(':');
    if (secondColon === -1) {
      entries.push({ id, key: rest.trim(), scopes: [] });
      return;
    }
    const key = rest.slice(0, secondColon).trim();
    const scopes = rest
      .slice(secondColon + 1)
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    entries.push({ id, key, scopes });
  });
  return entries;
}

function extractPresentedKey(req: IncomingMessage): string | undefined {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0) {
    return apiKeyHeader.trim();
  }
  return undefined;
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createApiKeyAuthenticator(raw: string | undefined): Authenticator {
  const entries = parseApiKeys(raw);

  return {
    strategy: 'apikey',
    async verify(req: IncomingMessage): Promise<AuthContext> {
      const presented = extractPresentedKey(req);
      if (presented === undefined) {
        throw new AuthError(401, 'Missing API key', 'Bearer realm="highchart-mcp"');
      }
      const match = entries.find((e) => safeEqual(e.key, presented));
      if (match === undefined) {
        throw new AuthError(401, 'Invalid API key', 'Bearer realm="highchart-mcp"');
      }
      return { authenticated: true, subject: match.id, scopes: match.scopes };
    },
  };
}
