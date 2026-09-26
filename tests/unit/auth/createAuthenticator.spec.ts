import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadCreateAuthenticator() {
  const mod = await import('../../../src/auth/index.js');
  return mod.createAuthenticator;
}

describe('createAuthenticator (oauth strategy fail-fast checks)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env['AUTH_STRATEGY'];
    delete process.env['PUBLIC_URL'];
    delete process.env['GITHUB_CLIENT_ID'];
    delete process.env['GITHUB_CLIENT_SECRET'];
  });

  it('throws when PUBLIC_URL is missing', async () => {
    process.env['AUTH_STRATEGY'] = 'oauth';
    process.env['GITHUB_CLIENT_ID'] = 'id';
    process.env['GITHUB_CLIENT_SECRET'] = 'secret';
    const { config } = await import('../../../src/config/index.js');
    expect(config.PUBLIC_URL).toBeUndefined();
    const createAuthenticator = await loadCreateAuthenticator();
    expect(() => createAuthenticator()).toThrow('PUBLIC_URL');
  });

  it('throws when GITHUB_CLIENT_ID/SECRET are missing', async () => {
    process.env['AUTH_STRATEGY'] = 'oauth';
    process.env['PUBLIC_URL'] = 'http://localhost:4000';
    const createAuthenticator = await loadCreateAuthenticator();
    expect(() => createAuthenticator()).toThrow('GITHUB_CLIENT_ID');
  });

  it('succeeds when PUBLIC_URL and GitHub credentials are set', async () => {
    process.env['AUTH_STRATEGY'] = 'oauth';
    process.env['PUBLIC_URL'] = 'http://localhost:4000';
    process.env['GITHUB_CLIENT_ID'] = 'id';
    process.env['GITHUB_CLIENT_SECRET'] = 'secret';
    const createAuthenticator = await loadCreateAuthenticator();
    const { authenticator, oauthRoutes } = createAuthenticator();
    expect(authenticator.strategy).toBe('oauth');
    expect(oauthRoutes).toBeDefined();
  });
});
