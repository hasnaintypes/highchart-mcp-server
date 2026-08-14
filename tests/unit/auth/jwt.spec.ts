import { describe, it, expect } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { createHmac } from 'node:crypto';
import { createJwtAuthenticator } from '../../../src/auth/jwt.js';
import { AuthError } from '../../../src/auth/types.js';

const SECRET = 'test-secret';

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload: Record<string, unknown>, opts?: { alg?: string; secret?: string }): string {
  const header = b64url(JSON.stringify({ alg: opts?.alg ?? 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', opts?.secret ?? SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

function req(token?: string): IncomingMessage {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} } as unknown as IncomingMessage;
}

describe('jwt authenticator (HS256)', () => {
  const auth = createJwtAuthenticator({ secret: SECRET });

  it('accepts a valid token and extracts sub + scopes', async () => {
    const token = sign({ sub: 'user1', scope: 'charts:render charts:export' });
    const ctx = await auth.verify(req(token));
    expect(ctx.authenticated).toBe(true);
    expect(ctx.subject).toBe('user1');
    expect(ctx.scopes).toEqual(['charts:render', 'charts:export']);
  });

  it('rejects a missing token', async () => {
    await expect(auth.verify(req())).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects an expired token', async () => {
    const token = sign({ sub: 'u', exp: Math.floor(Date.now() / 1000) - 10 });
    await expect(auth.verify(req(token))).rejects.toThrow(/expired/);
  });

  it('rejects a wrong signature', async () => {
    const token = sign({ sub: 'u' }, { secret: 'other-secret' });
    await expect(auth.verify(req(token))).rejects.toThrow(/signature/);
  });

  it('rejects an unsupported alg', async () => {
    const token = sign({ sub: 'u' }, { alg: 'none' });
    await expect(auth.verify(req(token))).rejects.toThrow(/alg/);
  });

  it('enforces issuer and audience when configured', async () => {
    const strict = createJwtAuthenticator({ secret: SECRET, issuer: 'iss1', audience: 'aud1' });
    await expect(
      strict.verify(req(sign({ sub: 'u', iss: 'wrong', aud: 'aud1' }))),
    ).rejects.toThrow(/issuer/);
    const ok = await strict.verify(req(sign({ sub: 'u', iss: 'iss1', aud: 'aud1' })));
    expect(ok.authenticated).toBe(true);
  });
});
