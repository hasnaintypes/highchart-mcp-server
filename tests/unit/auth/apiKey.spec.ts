import { describe, it, expect } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { parseApiKeys, createApiKeyAuthenticator } from '../../../src/auth/apiKey.js';
import { AuthError } from '../../../src/auth/types.js';

function req(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe('parseApiKeys', () => {
  it('parses bare keys, id:key, and id:key:scopes', () => {
    const entries = parseApiKeys('plainkey, id2:secret2, id3:secret3:charts:render|charts:export');
    expect(entries[0]).toEqual({ id: 'key-1', key: 'plainkey', scopes: [] });
    expect(entries[1]).toEqual({ id: 'id2', key: 'secret2', scopes: [] });
    expect(entries[2]!.id).toBe('id3');
    expect(entries[2]!.key).toBe('secret3');
    expect(entries[2]!.scopes).toContain('charts:render');
  });

  it('returns empty for undefined', () => {
    expect(parseApiKeys(undefined)).toEqual([]);
  });
});

describe('apiKey authenticator', () => {
  const auth = createApiKeyAuthenticator('id1:secret1:charts:render');

  it('accepts a valid Bearer key and returns scopes', async () => {
    const ctx = await auth.verify(req({ authorization: 'Bearer secret1' }));
    expect(ctx.authenticated).toBe(true);
    expect(ctx.subject).toBe('id1');
    expect(ctx.scopes).toContain('charts:render');
  });

  it('accepts x-api-key header', async () => {
    const ctx = await auth.verify(req({ 'x-api-key': 'secret1' }));
    expect(ctx.authenticated).toBe(true);
  });

  it('rejects a missing key with 401', async () => {
    await expect(auth.verify(req({}))).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an invalid key with 401', async () => {
    await expect(auth.verify(req({ authorization: 'Bearer nope' }))).rejects.toMatchObject({
      status: 401,
    });
  });
});
