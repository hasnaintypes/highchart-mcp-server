import type { IncomingMessage } from 'node:http';
import { config } from '../config/index.js';
import type { AuthContext, Authenticator } from './types.js';
import { AuthError } from './types.js';
import { createApiKeyAuthenticator } from './apiKey.js';
import { createJwtAuthenticator } from './jwt.js';

export type { AuthContext, Authenticator } from './types.js';
export { AuthError } from './types.js';
export { parseApiKeys } from './apiKey.js';

const ANONYMOUS: AuthContext = { authenticated: false, scopes: [] };

/** Builds the authenticator for the configured strategy. */
export function createAuthenticator(): Authenticator {
  switch (config.AUTH_STRATEGY) {
    case 'apikey':
      return createApiKeyAuthenticator(config.API_KEYS);
    case 'jwt': {
      if (config.JWT_SECRET === undefined) {
        throw new Error('AUTH_STRATEGY=jwt requires JWT_SECRET to be set.');
      }
      return createJwtAuthenticator({
        secret: config.JWT_SECRET,
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      });
    }
    case 'none':
    default:
      return {
        strategy: 'none',
        async verify(): Promise<AuthContext> {
          return ANONYMOUS;
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
