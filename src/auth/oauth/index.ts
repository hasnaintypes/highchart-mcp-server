import { randomBytes } from 'node:crypto';
import type { AuthContext, Authenticator } from '../types.js';
import { AuthError } from '../types.js';
import { createJwtAuthenticator } from '../jwt.js';
import { createOAuthStore } from './store.js';
import { createOAuthRoutes } from './routes.js';

export type { OAuthStore } from './store.js';
export { createOAuthRoutes } from './routes.js';
export { buildProtectedResourceMetadata, buildAuthorizationServerMetadata } from './metadata.js';

export interface OAuthOptions {
  publicUrl: string;
  apiKeys: string | undefined;
  accessTokenTtlMs: number;
  codeTtlMs: number;
}

/**
 * Builds a self-contained OAuth 2.1 authorization server + resource server for
 * this MCP server. `authenticator` verifies bearer tokens on `/mcp` (delegating
 * to the same HS256 verification `createJwtAuthenticator` already implements,
 * bound to this server's own issuer/audience); `routes` implements the
 * `/register`, `/authorize`, `/token`, and `.well-known` endpoints that issue
 * those tokens. The signing secret is generated per-process (see `store.ts`
 * for why that's acceptable: clients simply re-run the OAuth flow on a 401).
 */
export function createOAuth(options: OAuthOptions): {
  authenticator: Authenticator;
  routes: ReturnType<typeof createOAuthRoutes>;
} {
  const secret = randomBytes(32).toString('base64url');
  const store = createOAuthStore(options.codeTtlMs);
  const resourceMetadataUrl = `${options.publicUrl}/.well-known/oauth-protected-resource`;
  const wwwAuthenticate = `Bearer resource_metadata="${resourceMetadataUrl}"`;

  const jwtAuth = createJwtAuthenticator({
    secret,
    issuer: options.publicUrl,
    audience: `${options.publicUrl}/mcp`,
  });

  const authenticator: Authenticator = {
    strategy: 'oauth',
    async verify(req): Promise<AuthContext> {
      try {
        return await jwtAuth.verify(req);
      } catch (error) {
        if (error instanceof AuthError) {
          throw new AuthError(error.status, error.message, wwwAuthenticate);
        }
        throw error;
      }
    },
  };

  const routes = createOAuthRoutes({
    store,
    publicUrl: options.publicUrl,
    secret,
    apiKeys: options.apiKeys,
    accessTokenTtlMs: options.accessTokenTtlMs,
  });

  return { authenticator, routes };
}
