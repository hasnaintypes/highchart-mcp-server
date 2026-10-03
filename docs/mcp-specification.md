# MCP Specification — how this server implements it

This describes how the Highcharts MCP Server implements the [Model Context
Protocol](https://modelcontextprotocol.io) — not the protocol spec itself
(see the official docs for that). MCP is JSON-RPC 2.0 based; this server uses
the high-level `McpServer` class from `@modelcontextprotocol/sdk`.

## Transports implemented

- **STDIO** (primary) — `StdioServerTransport`, one `McpServer` per process.
  No auth (local/trusted client).
- **Streamable HTTP** (networked) — `StreamableHTTPServerTransport`, one
  `McpServer` per `mcp-session-id`. Handles SSE fallback internally.
- **Standalone SSE is not implemented** — it's deprecated in the SDK.

## Tools

Registered via `server.registerTool()` in `src/tools/index.ts`. Four tools,
all returning a `CallToolResult` (`src/utils/responseFormatter.ts`); errors
set `isError: true`. For svg/png renders, the result includes an `image`
content block (base64 + `mimeType`) ahead of the JSON text block, so clients
that render MCP images (Claude Desktop, claude.ai, etc.) show the chart
inline. PDF (and plain `{ constr, options }` config with no `format`) stay
text-only — there's no sensible inline preview for those.

| Tool | Input | Output |
| --- | --- | --- |
| `create_chart` | `{ type, title?, series?, ... }` (per-family shape) | `{ constr, options }`, or `{ config, format, data }` if `format` given |
| `render_chart` | `{ chartOptions, format?, constr? }` (raw Highcharts options) | `{ config, format, data }` |
| `export_chart` | `{ chartOptions, format, constr?, width?, height?, scale? }` | `{ config, format, data }` |
| `list_chart_types` | `{ family? }` | `{ totalTypes, totalFamilies, families: [...] }` |

The MCP SDK only publishes JSON Schema for object-typed inputs, not unions —
so `create_chart` advertises an object schema (a `type` enum of all 70 types +
optional fields) for discovery, and runs precise per-type validation inside
the handler against `CreateChartInputSchema` (a Zod discriminated union built
from the chart-family registry, `src/charts/registry.ts`).

## Capability negotiation

Standard MCP initialize handshake via the SDK; this server advertises `tools`
only (no `resources` or `prompts`).

## Authentication & authorization (HTTP transport only)

STDIO has no auth by design. For Streamable HTTP, `AUTH_STRATEGY` selects one
of:

- `none` (default) — no auth.
- `apikey` — Bearer token or `x-api-key` header, timing-safe compare,
  optional per-key scopes.
- `jwt` — HS256 only (signature + `exp`/`nbf` + optional `iss`/`aud`), no
  external dependency.
- `oauth` — authorization-code + PKCE flow with dynamic client registration
  (per the MCP Authorization spec), sign-in delegated to GitHub. This server
  acts as both the authorization server and resource server. See README §
  "Connecting from Claude.ai / ChatGPT" for setup.

`AUTH_REQUIRED_SCOPES` enforces scopes across all strategies via
`requireScopes()`. There is no per-tool authorization — scope checks apply at
the transport/request level, not per MCP method.

## Error handling

Tool errors are returned as a normal `CallToolResult` with `isError: true`
and a text message (not a JSON-RPC protocol-level error) — see
`handleToolError()` in `src/utils/errorHandler.ts`. Transport-level failures
(bad auth, body too large, rate limited) return HTTP status codes (401/403,
413, 429) before a JSON-RPC exchange happens.

## Metadata, cancellation, progress

Not used by this server — no `_meta` conventions, cancellation, or progress
notifications are implemented. Standard JSON-RPC request/response/
notification framing from the SDK is used as-is.
