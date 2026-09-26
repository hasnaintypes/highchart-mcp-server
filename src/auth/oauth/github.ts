const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const ORGS_URL = 'https://api.github.com/user/orgs';
const USER_AGENT = 'highchart-mcp-server';

export interface GithubUser {
  login: string;
  id: number;
}

export function buildGithubAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  includeOrgScope: boolean;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', options.redirectUri);
  url.searchParams.set('state', options.state);
  url.searchParams.set('scope', options.includeOrgScope ? 'read:user read:org' : 'read:user');
  return url.toString();
}

export async function exchangeGithubCode(options: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      code: options.code,
      redirect_uri: options.redirectUri,
    }),
  });
  const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (typeof body.access_token !== 'string') {
    throw new Error(body.error_description ?? body.error ?? 'GitHub token exchange failed');
  }
  return body.access_token;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const res = await fetch(USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GitHub user lookup failed (${res.status})`);
  const body = (await res.json()) as { login: string; id: number };
  return { login: body.login, id: body.id };
}

export async function fetchGithubOrgs(accessToken: string): Promise<string[]> {
  const res = await fetch(ORGS_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GitHub org lookup failed (${res.status})`);
  const body = (await res.json()) as Array<{ login: string }>;
  return body.map((org) => org.login);
}

export function isAllowed(
  login: string,
  orgs: string[],
  allowedUsers: string[],
  allowedOrgs: string[],
): boolean {
  if (allowedUsers.length === 0 && allowedOrgs.length === 0) return true;
  const loginLower = login.toLowerCase();
  if (allowedUsers.some((u) => u.toLowerCase() === loginLower)) return true;
  const orgsLower = new Set(orgs.map((o) => o.toLowerCase()));
  return allowedOrgs.some((o) => orgsLower.has(o.toLowerCase()));
}
