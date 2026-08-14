import type { IncomingMessage } from 'node:http';

/** Result of authenticating a request. */
export interface AuthContext {
  authenticated: boolean;
  /** API key id or JWT `sub`. */
  subject?: string;
  /** Granted scopes (e.g. ['charts:render']). */
  scopes: string[];
}

/** Thrown by authenticators to signal an HTTP auth failure. */
export class AuthError extends Error {
  readonly status: number;
  readonly wwwAuthenticate?: string;

  constructor(status: number, message: string, wwwAuthenticate?: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    if (wwwAuthenticate !== undefined) this.wwwAuthenticate = wwwAuthenticate;
  }
}

/** Verifies an incoming request and returns its auth context, or throws AuthError. */
export interface Authenticator {
  readonly strategy: 'none' | 'apikey' | 'jwt';
  verify(req: IncomingMessage): Promise<AuthContext>;
}
