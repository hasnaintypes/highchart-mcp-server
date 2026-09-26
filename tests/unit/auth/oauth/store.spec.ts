import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOAuthStore } from '../../../../src/auth/oauth/store.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createOAuthStore', () => {
  it('registers a client and looks it up by id', () => {
    const store = createOAuthStore(60_000);
    const client = store.registerClient(['https://example.com/callback'], 'Test Client');
    expect(store.getClient(client.clientId)).toEqual(client);
    expect(store.getClient('unknown')).toBeUndefined();
  });

  it('auth codes are single-use', () => {
    const store = createOAuthStore(60_000);
    const code = store.createAuthCode({
      clientId: 'c1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: 'chal',
      subject: 'user1',
      scopes: ['charts:render'],
    });
    const first = store.consumeAuthCode(code);
    expect(first?.subject).toBe('user1');
    expect(store.consumeAuthCode(code)).toBeUndefined();
  });

  it('expires auth codes after the configured TTL', () => {
    vi.useFakeTimers();
    const store = createOAuthStore(1000);
    const code = store.createAuthCode({
      clientId: 'c1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: 'chal',
      subject: 'user1',
      scopes: [],
    });
    vi.advanceTimersByTime(1001);
    expect(store.consumeAuthCode(code)).toBeUndefined();
  });

  it('refresh tokens are rotated (single-use)', () => {
    const store = createOAuthStore(60_000);
    const token = store.createRefreshToken({ clientId: 'c1', subject: 'user1', scopes: ['a'] });
    const first = store.consumeRefreshToken(token);
    expect(first?.subject).toBe('user1');
    expect(store.consumeRefreshToken(token)).toBeUndefined();
  });

  it('pending authorizations are single-use', () => {
    const store = createOAuthStore(60_000);
    const id = store.createPendingAuth({
      clientId: 'c1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: 'chal',
      state: 'xyz',
    });
    const first = store.consumePendingAuth(id);
    expect(first?.clientId).toBe('c1');
    expect(first?.state).toBe('xyz');
    expect(store.consumePendingAuth(id)).toBeUndefined();
  });

  it('expires pending authorizations after 10 minutes', () => {
    vi.useFakeTimers();
    const store = createOAuthStore(60_000);
    const id = store.createPendingAuth({
      clientId: 'c1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: 'chal',
    });
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(store.consumePendingAuth(id)).toBeUndefined();
  });
});
