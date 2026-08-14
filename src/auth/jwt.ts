import type { IncomingMessage } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthContext, Authenticator } from './types.js';
import { AuthError } from './types.js';

export interface JwtOptions {
  secret: string;
  issuer?: string | undefined;
  audience?: string | undefined;
}

interface JwtPayload {
  sub?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  scope?: string;
  scp?: string | string[];
  [key: string]: unknown;
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function extractBearer(req: IncomingMessage): string | undefined {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  return undefined;
}

function extractScopes(payload: JwtPayload): string[] {
  if (typeof payload.scope === 'string') {
    return payload.scope.split(' ').filter((s) => s.length > 0);
  }
  if (Array.isArray(payload.scp)) return payload.scp;
  if (typeof payload.scp === 'string') return payload.scp.split(' ').filter((s) => s.length > 0);
  return [];
}

/**
 * Minimal, dependency-free HS256 JWT authenticator. Verifies signature, `exp`,
 * `nbf`, and optional `iss`/`aud`. For RS256/JWKS, front the server with a proxy
 * or extend this with the `jose` package.
 */
export function createJwtAuthenticator(options: JwtOptions): Authenticator {
  return {
    strategy: 'jwt',
    async verify(req: IncomingMessage): Promise<AuthContext> {
      const token = extractBearer(req);
      if (token === undefined) {
        throw new AuthError(401, 'Missing bearer token', 'Bearer realm="highchart-mcp"');
      }

      const segments = token.split('.');
      if (segments.length !== 3) {
        throw new AuthError(401, 'Malformed JWT');
      }
      const [headerB64, payloadB64, signatureB64] = segments as [string, string, string];

      let header: { alg?: string };
      let payload: JwtPayload;
      try {
        header = JSON.parse(base64urlDecode(headerB64).toString('utf8'));
        payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
      } catch {
        throw new AuthError(401, 'Invalid JWT encoding');
      }

      if (header.alg !== 'HS256') {
        throw new AuthError(401, `Unsupported JWT alg: ${String(header.alg)}`);
      }

      const expected = createHmac('sha256', options.secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();
      const provided = base64urlDecode(signatureB64);
      if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        throw new AuthError(401, 'Invalid JWT signature');
      }

      const now = Math.floor(Date.now() / 1000);
      if (typeof payload.exp === 'number' && now >= payload.exp) {
        throw new AuthError(401, 'JWT expired');
      }
      if (typeof payload.nbf === 'number' && now < payload.nbf) {
        throw new AuthError(401, 'JWT not yet valid');
      }
      if (options.issuer !== undefined && payload.iss !== options.issuer) {
        throw new AuthError(401, 'JWT issuer mismatch');
      }
      if (options.audience !== undefined) {
        const aud = payload.aud;
        const ok = Array.isArray(aud) ? aud.includes(options.audience) : aud === options.audience;
        if (!ok) throw new AuthError(401, 'JWT audience mismatch');
      }

      const context: AuthContext = { authenticated: true, scopes: extractScopes(payload) };
      if (typeof payload.sub === 'string') context.subject = payload.sub;
      return context;
    },
  };
}
