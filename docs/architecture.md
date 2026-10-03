# Architecture — Highcharts MCP Server

A Model Context Protocol (MCP) server that turns chart requests into validated
Highcharts configurations and rendered images (SVG/PNG/PDF). This document
describes the actual, implemented architecture — for the authoritative version
see `CLAUDE.md` at the repo root, which this mirrors at a lower level of detail.

## System overview

```
AI Host (Claude, ChatGPT, Cursor, ...)
      │  MCP client (STDIO or Streamable HTTP)
      ▼
┌─────────────────────────────────────────────────────────┐
│ Transport layer      src/transports/{stdio,streamable}/ │
│ Auth + rate limit    src/auth/, src/middleware/          │  (HTTP only)
│ MCP server core      src/server.ts (McpServer + tools)   │
│ Tools                src/tools/chart/                    │
│ Chart engine         src/charts/ (families + registry)   │
│ Rendering            src/services/exportService.ts       │
│ Observability        src/metrics/                         │
└─────────────────────────────────────────────────────────┘
```

## Transport layer

- **STDIO** (`src/transports/stdio/`) — primary, local, zero-config. One
  `McpServer` per process. No auth (local/trusted). Logs go to stderr so
  stdout stays clean for the JSON-RPC stream.
- **Streamable HTTP** (`src/transports/streamable/`) — networked. Request
  pipeline in `handlers.ts`: body-size check (413) → auth (401/403) → rate
  limit (429) → session routing. `sessionManager.ts` keeps one `McpServer` +
  `StreamableHTTPServerTransport` per `mcp-session-id` (an `McpServer` binds to
  a single transport, hence one per session).
- Standalone SSE transport is **not used** — it's deprecated in the MCP SDK;
  `StreamableHTTPServerTransport` handles SSE fallback internally.

## MCP server core

`src/server.ts` builds an `McpServer` (from `@modelcontextprotocol/sdk`) and
calls `registerAllTools()` (`src/tools/index.ts`), which registers the four
tools below via `server.registerTool()`.

## Tools (`src/tools/chart/`)

| Tool | Purpose |
| --- | --- |
| `create_chart` | Structured input → validated Highcharts config for any of the 70 types. |
| `render_chart` | Raw Highcharts options passthrough, any type. |
| `export_chart` | Like `render_chart` plus `format`/`width`/`height`/`scale`. |
| `list_chart_types` | Discovery: every type grouped by family with data-shape hints. |

There's no separate "validation layer" — validation lives in `src/charts/`
(per-family Zod schemas + a generated discriminated union) and
`src/types/chart.ts` (schemas for the raw passthrough tools).

## Chart engine (`src/charts/`)

Every Highcharts series type belongs to a **family** (`src/charts/families/`,
15 families covering all 70 types). A family declares its member types, the
required constructor (`chart`/`stockChart`/`mapChart`/`ganttChart`), a Zod
input schema, and a builder function. `registry.ts` assembles the families
into `CreateChartInputSchema` (a discriminated union on `type`) and exposes
`buildFromInput()` / `chartCatalog()`.

## Rendering (`src/services/exportService.ts`)

Wraps `highcharts-export-server` v5 (`setOptions` → `initExport` →
`startExport` → `killPool`), headless Chromium via Puppeteer. Handles export
timeouts (`EXPORT_TIMEOUT_MS`), a worker pool (`EXPORT_MAX_WORKERS`), Highcharts
credits injection (see `LICENSING.md`), and records metrics per export.

## Security (HTTP only) — `src/auth/`, `src/middleware/`

- **Authenticators:** `none` (default), `apikey` (Bearer/`x-api-key`,
  timing-safe compare, per-key scopes), `jwt` (dependency-free HS256:
  signature + `exp`/`nbf` + optional `iss`/`aud`), `oauth` (authorization-code
  + PKCE, sign-in delegated to GitHub — this server acts as both authorization
  and resource server; see README § Connecting from Claude.ai/ChatGPT).
- **Rate limiting:** in-process token bucket keyed by authenticated subject
  or client IP (`RATE_LIMIT_ENABLED`/`RATE_LIMIT_RPM`/`RATE_LIMIT_BURST`) →
  `429` + `Retry-After`. Per-process only — multiple replicas would need a
  shared store (not implemented).
- STDIO has no auth by design (local, trusted).

## Observability (`src/metrics/`)

Dependency-free counters/histograms/gauges + a Prometheus text renderer.
`GET /health` (always open) and `GET /metrics` (auth-gated unless
`METRICS_PUBLIC=true`).

## What's not implemented

See README § Roadmap for the current done/next split. Natural-language
charting, AI-driven chart suggestions, auto-correction, and dashboard/batch
export tooling are future ideas, not implemented — treat any description of
them as a proposal, not current behavior.
