/** RFC 9728 OAuth 2.0 Protected Resource Metadata for this MCP server. */
export function buildProtectedResourceMetadata(publicUrl: string): Record<string, unknown> {
  return {
    resource: `${publicUrl}/mcp`,
    authorization_servers: [publicUrl],
  };
}

/** RFC 8414 OAuth 2.0 Authorization Server Metadata — this server is both AS and RS. */
export function buildAuthorizationServerMetadata(publicUrl: string): Record<string, unknown> {
  return {
    issuer: publicUrl,
    authorization_endpoint: `${publicUrl}/authorize`,
    token_endpoint: `${publicUrl}/token`,
    registration_endpoint: `${publicUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  };
}
