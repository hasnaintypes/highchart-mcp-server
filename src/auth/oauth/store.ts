import { randomBytes, randomUUID } from 'node:crypto';

/**
 * In-process store for OAuth dynamic client registrations, authorization codes,
 * and refresh tokens. Like `middleware/rateLimit.ts`, state is per-process only —
 * multi-instance deployments need a shared store (out of scope here). Clients
 * re-run the OAuth flow on a 401, so losing state on restart is acceptable.
 */

export interface RegisteredClient {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
}

export interface AuthCodeEntry {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  subject: string;
  scopes: string[];
  expiresAt: number;
}

export interface RefreshTokenEntry {
  clientId: string;
  subject: string;
  scopes: string[];
}

export interface PendingAuthEntry {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  resource?: string;
  expiresAt: number;
}

/** How long a pending authorization survives the round trip to GitHub and back. */
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;

export interface OAuthStore {
  registerClient(redirectUris: string[], clientName?: string): RegisteredClient;
  getClient(clientId: string): RegisteredClient | undefined;
  createAuthCode(entry: Omit<AuthCodeEntry, 'expiresAt'>): string;
  consumeAuthCode(code: string): AuthCodeEntry | undefined;
  createRefreshToken(entry: RefreshTokenEntry): string;
  consumeRefreshToken(token: string): RefreshTokenEntry | undefined;
  createPendingAuth(entry: Omit<PendingAuthEntry, 'expiresAt'>): string;
  consumePendingAuth(id: string): PendingAuthEntry | undefined;
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function createOAuthStore(codeTtlMs: number): OAuthStore {
  const clients = new Map<string, RegisteredClient>();
  const authCodes = new Map<string, AuthCodeEntry>();
  const refreshTokens = new Map<string, RefreshTokenEntry>();
  const pendingAuths = new Map<string, PendingAuthEntry>();

  function sweepExpiredCodes(now: number): void {
    for (const [code, entry] of authCodes) {
      if (entry.expiresAt <= now) authCodes.delete(code);
    }
  }

  function sweepExpiredPendingAuths(now: number): void {
    for (const [id, entry] of pendingAuths) {
      if (entry.expiresAt <= now) pendingAuths.delete(id);
    }
  }

  return {
    registerClient(redirectUris, clientName) {
      const clientId = randomUUID();
      const client: RegisteredClient = { clientId, redirectUris };
      if (clientName !== undefined) client.clientName = clientName;
      clients.set(clientId, client);
      return client;
    },

    getClient(clientId) {
      return clients.get(clientId);
    },

    createAuthCode(entry) {
      const now = Date.now();
      sweepExpiredCodes(now);
      const code = newToken();
      authCodes.set(code, { ...entry, expiresAt: now + codeTtlMs });
      return code;
    },

    consumeAuthCode(code) {
      const entry = authCodes.get(code);
      authCodes.delete(code);
      if (entry === undefined) return undefined;
      if (entry.expiresAt <= Date.now()) return undefined;
      return entry;
    },

    createRefreshToken(entry) {
      const token = newToken();
      refreshTokens.set(token, entry);
      return token;
    },

    consumeRefreshToken(token) {
      const entry = refreshTokens.get(token);
      refreshTokens.delete(token);
      return entry;
    },

    createPendingAuth(entry) {
      const now = Date.now();
      sweepExpiredPendingAuths(now);
      const id = newToken();
      pendingAuths.set(id, { ...entry, expiresAt: now + PENDING_AUTH_TTL_MS });
      return id;
    },

    consumePendingAuth(id) {
      const entry = pendingAuths.get(id);
      pendingAuths.delete(id);
      if (entry === undefined) return undefined;
      if (entry.expiresAt <= Date.now()) return undefined;
      return entry;
    },
  };
}
