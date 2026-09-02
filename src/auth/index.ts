import type { IncomingMessage } from 'node:http';
import { config } from '../config/index.js';
import type { AuthContext, Authenticator } from './types.js';
import { AuthError } from './types.js';
import { createApiKeyAuthenticator } from './apiKey.js';
import { createJwtAuthenticator } from './jwt.js';
import { createOAuth } from './oauth/index.js';
import type { createOAuthRoutes } from './oauth/index.js';

export type { AuthContext, Authenticator } from './types.js';
export { AuthError } from './types.js';
export { parseApiKeys } from './apiKey.js';

const ANONYMOUS: AuthContext = { authenticated: false, scopes: [] };

/** Non-`/mcp` OAuth endpoints (discovery, DCR, authorize, token). */
export type OAuthRoutes = ReturnType<typeof createOAuthRoutes>;

/**
 * Builds the authenticator (and, for AUTH_STRATEGY=oauth, the paired discovery/
 * DCR/authorize/token routes) for the configured strategy. Call once per
 * process — the oauth strategy owns an in-process client/code/token store that
 * the authenticator and routes must share.
 */
export function createAuthenticator(): { authenticator: Authenticator; oauthRoutes?: OAuthRoutes } {
  switch (config.AUTH_STRATEGY) {
    case 'apikey':
      return { authenticator: createApiKeyAuthenticator(config.API_KEYS) };
    case 'jwt': {
      if (config.JWT_SECRET === undefined) {
        throw new Error('AUTH_STRATEGY=jwt requires JWT_SECRET to be set.');
      }
      return {
        authenticator: createJwtAuthenticator({
          secret: config.JWT_SECRET,
          issuer: config.JWT_ISSUER,
          audience: config.JWT_AUDIENCE,
        }),
      };
    }
    case 'oauth': {
      if (config.PUBLIC_URL === undefined) {
        throw new Error('AUTH_STRATEGY=oauth requires PUBLIC_URL to be set.');
      }
      const oauth = createOAuth({
        publicUrl: config.PUBLIC_URL,
        apiKeys: config.API_KEYS,
        accessTokenTtlMs: config.OAUTH_ACCESS_TOKEN_TTL_MS,
        codeTtlMs: config.OAUTH_CODE_TTL_MS,
      });
      return { authenticator: oauth.authenticator, oauthRoutes: oauth.routes };
    }
    case 'none':
    default:
      return {
        authenticator: {
          strategy: 'none',
          async verify(): Promise<AuthContext> {
            return ANONYMOUS;
          },
        },
      };
  }
}

/** Ensures the context holds every required scope, else throws AuthError(403). */
export function requireScopes(ctx: AuthContext, required: readonly string[]): void {
  if (required.length === 0) return;
  const missing = required.filter((s) => !ctx.scopes.includes(s));
  if (missing.length > 0) {
    throw new AuthError(403, `Missing required scope(s): ${missing.join(', ')}`);
  }
}

/**
 * Authenticates a request and enforces required scopes. Returns the context.
 * Throws AuthError on failure. A no-op for the 'none' strategy.
 */
export async function authenticateRequest(
  authenticator: Authenticator,
  req: IncomingMessage,
): Promise<AuthContext> {
  if (authenticator.strategy === 'none') return ANONYMOUS;
  const ctx = await authenticator.verify(req);
  requireScopes(ctx, config.AUTH_REQUIRED_SCOPES);
  return ctx;
}
