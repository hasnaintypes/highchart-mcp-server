import type { IncomingMessage, ServerResponse } from 'node:http';
import { logger, getErrorMessage } from '../../utils/index.js';
import { config } from '../../config/index.js';
import { renderProm, uptimeSeconds, incr } from '../../metrics/index.js';
import { createAuthenticator, authenticateRequest, AuthError } from '../../auth/index.js';
import type { Authenticator, AuthContext, OAuthRoutes } from '../../auth/index.js';
import { createRateLimiter, type RateLimiter } from '../../middleware/rateLimit.js';
import type { SessionManager } from './sessionManager.js';

function clientKey(req: IncomingMessage, ctx: AuthContext): string {
  if (ctx.subject !== undefined) return `sub:${ctx.subject}`;
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0]!.trim() : req.socket.remoteAddress;
  return `ip:${ip ?? 'unknown'}`;
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

export function createRequestHandler(
  sessions: SessionManager,
): (req: IncomingMessage, res: ServerResponse) => void {
  // Built once from config (fail fast on misconfiguration, e.g. jwt w/o secret).
  const { authenticator, oauthRoutes } = createAuthenticator();
  const limiter: RateLimiter | undefined = config.RATE_LIMIT_ENABLED
    ? createRateLimiter(config.RATE_LIMIT_RPM, config.RATE_LIMIT_BURST)
    : undefined;

  return (req, res) => {
    const fullUrl = new URL(req.url ?? '/', 'http://internal');
    const url = fullUrl.pathname;

    // Health is always open (no auth, no rate limit).
    if (url === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        status: 'ok',
        version: config.SERVER_VERSION,
        uptimeSeconds: Math.round(uptimeSeconds()),
      });
      return;
    }

    // OAuth discovery/DCR/authorize/token endpoints ARE the auth mechanism, so
    // they're unauthenticated by definition; only registered for AUTH_STRATEGY=oauth.
    if (oauthRoutes !== undefined) {
      const handled = handleOAuthRoute(req, res, url, fullUrl, oauthRoutes, limiter);
      if (handled) return;
    }

    void handleProtected(req, res, url, sessions, authenticator, limiter).catch((error: unknown) => {
      const message = getErrorMessage(error);
      logger.error('Unhandled request error', { error: message });
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    });
  };
}

function oauthClientKey(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0]!.trim() : req.socket.remoteAddress;
  return `ip:${ip ?? 'unknown'}`;
}

/** Returns true if the route matched (and the response was handled or will be). */
function handleOAuthRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  fullUrl: URL,
  routes: OAuthRoutes,
  limiter: RateLimiter | undefined,
): boolean {
  if (url === '/.well-known/oauth-protected-resource' && req.method === 'GET') {
    routes.protectedResourceMetadata(req, res);
    return true;
  }
  if (url === '/.well-known/oauth-authorization-server' && req.method === 'GET') {
    routes.authorizationServerMetadata(req, res);
    return true;
  }
  if (url === '/register' && req.method === 'POST') {
    void routes.register(req, res);
    return true;
  }
  if (url === '/authorize' && req.method === 'GET') {
    routes.authorizeGet(req, res, fullUrl.searchParams);
    return true;
  }
  // Login submission and token exchange are rate limited per-IP (unauthenticated).
  if (url === '/authorize' && req.method === 'POST') {
    if (limiter !== undefined && !limiter.check(oauthClientKey(req)).allowed) {
      sendJson(res, 429, { error: 'Too many requests' });
      return true;
    }
    void routes.authorizePost(req, res);
    return true;
  }
  if (url === '/token' && req.method === 'POST') {
    if (limiter !== undefined && !limiter.check(oauthClientKey(req)).allowed) {
      sendJson(res, 400, { error: 'invalid_request', error_description: 'Too many requests' });
      return true;
    }
    void routes.token(req, res);
    return true;
  }
  return false;
}

async function handleProtected(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  sessions: SessionManager,
  authenticator: Authenticator,
  limiter: RateLimiter | undefined,
): Promise<void> {
  // --- /metrics (auth unless METRICS_PUBLIC; never rate limited) ---
  if (url === '/metrics' && req.method === 'GET') {
    if (!config.METRICS_ENABLED) {
      sendJson(res, 404, { error: 'Metrics disabled' });
      return;
    }
    if (!config.METRICS_PUBLIC && authenticator.strategy !== 'none') {
      try {
        await authenticateRequest(authenticator, req);
      } catch (error) {
        respondAuthError(res, error);
        return;
      }
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
    res.end(renderProm());
    return;
  }

  // --- /mcp (body limit -> auth -> rate limit -> handle) ---
  if (url === '/mcp') {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > config.HTTP_MAX_BODY_BYTES) {
      logger.warn('Rejected oversized MCP request', {
        contentLength,
        limit: config.HTTP_MAX_BODY_BYTES,
      });
      sendJson(res, 413, { error: 'Payload too large' });
      return;
    }

    let ctx: AuthContext;
    try {
      ctx = await authenticateRequest(authenticator, req);
    } catch (error) {
      respondAuthError(res, error);
      return;
    }

    if (limiter !== undefined) {
      const result = limiter.check(clientKey(req, ctx));
      if (!result.allowed) {
        incr('highchart_rate_limited_total', undefined, 'Total requests rejected by rate limiting.');
        sendJson(
          res,
          429,
          { error: 'Too many requests' },
          {
            'Retry-After': String(result.retryAfterSeconds),
            'RateLimit-Remaining': String(result.remaining),
          },
        );
        return;
      }
    }

    await sessions.handle(req, res).catch((error: unknown) => {
      const message = getErrorMessage(error);
      logger.error('Error handling MCP request', { error: message });
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function respondAuthError(res: ServerResponse, error: unknown): void {
  if (error instanceof AuthError) {
    incr('highchart_auth_failures_total', { status: String(error.status) }, 'Total authentication/authorization failures.');
    const headers: Record<string, string> = {};
    if (error.wwwAuthenticate !== undefined) headers['WWW-Authenticate'] = error.wwwAuthenticate;
    sendJson(res, error.status, { error: error.message }, headers);
    return;
  }
  logger.error('Auth error', { error: getErrorMessage(error) });
  sendJson(res, 500, { error: 'Internal server error' });
}
