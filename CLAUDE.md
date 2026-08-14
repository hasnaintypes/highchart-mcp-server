# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that generates Highcharts-based chart visualizations. It exposes chart generation tools to MCP-capable AI clients (Claude, ChatGPT, Cursor, etc.) for automated chart creation, validation, and export.

## Commands

- **Dev (watch mode):** `npm run dev` — runs `tsx --watch src/index.ts`
- **Build:** `npm run build` — compiles TypeScript via `tsc`
- **Start:** `npm start` — runs compiled `node dist/index.js`
- **Test:** `npm test` — runs `vitest run` (single run)
- **Test (watch):** `npm run test:watch` — runs `vitest` in watch mode
- **Seed render cache (offline):** `npm run seed:cache` — caches Highcharts scripts from the local package
- **Render samples:** `npm run render:samples` — writes one SVG per constructor to `.render-samples/`

## Architecture

Source lives in `src/` with the following structure:

- `src/index.ts` — Entry point (init export service, start transport, shutdown)
- `src/server.ts` — `createMcpServer()` factory (new server per HTTP session / once for STDIO)
- `src/config/` — Environment configuration (`env.ts`, frozen `config` object)
- `src/transports/` — Transport layer
  - `stdio/` — STDIO transport (primary, local clients)
  - `streamable/` — Streamable HTTP: `index.ts`, `handlers.ts` (routing + auth/rate-limit/metrics), `sessionManager.ts` (per-session server+transport)
- `src/charts/` — Chart-type engine: `types.ts` (ChartFamily), `registry.ts` (lookup + generated discriminated union + catalog), `shared.ts` (seriesFamily factory), `families/*` (15 families covering all 70 types)
- `src/tools/chart/` — MCP tools: `createChart`, `renderChart`, `exportChart`, `listChartTypes`
- `src/types/` — Shared Zod schemas/types (`chart.ts`) + `exportServer.d.ts`
- `src/services/` — `exportService.ts` (highcharts-export-server wrapper: init/shutdown/export, credits, timeout)
- `src/metrics/` — In-process metrics registry + Prometheus renderer
- `src/auth/` — Authenticators: `apiKey.ts`, `jwt.ts` (HS256), scope enforcement
- `src/middleware/` — `rateLimit.ts` (token bucket)
- `src/utils/` — `logger.ts` (stderr), `errorHandler.ts`, `responseFormatter.ts`

Note: there is no `src/validation/` directory — validation lives in
`src/charts/` (per-family Zod schemas + generated union) and `src/types/chart.ts`.

### Chart engine

- Every Highcharts series type belongs to a **family** (`src/charts/families/`).
  Each family declares its member types, required constructor (`chart`/`stockChart`/
  `mapChart`/`ganttChart`), a Zod input schema, and a builder.
- `create_chart` advertises an **object** JSON schema (a `type` enum of all types
  + optional family fields) because the MCP SDK only publishes JSON schema for
  object schemas; precise per-type validation runs in the handler via the
  registry's `CreateChartInputSchema` discriminated union.
- Adding a type: extend/author a family in `src/charts/families/`, register it in
  `families/index.ts`. The matrix test asserts all 70 types build.

### Transport Strategy

- **STDIO** is the primary transport (local clients). No auth (local/trusted).
- **Streamable HTTP** is the network transport, with per-session management,
  auth + rate limiting, `/health`, and `/metrics`.
- Standalone SSE transport is deprecated in the SDK — do not use `SSEServerTransport`.

### MCP SDK Usage

- Use **`McpServer`** (from `@modelcontextprotocol/sdk/server/mcp.js`), not the lower-level `Server` class
- Register tools via **`server.registerTool()`**
- An McpServer binds to one transport; use a fresh server per HTTP session
- Use **`InMemoryTransport`** for testing (from `@modelcontextprotocol/sdk/inMemory.js`)

## Key Technical Details

- **ESM project** (`"type": "module"` in package.json) — use `import`/`export`, not `require`
- **TypeScript** with strict mode, `NodeNext` module resolution, and `verbatimModuleSyntax`
- Source in `src/`, compiled output in `dist/`
- **Zod v4** (`zod@^4.3.6`) for schema validation — note API differences from Zod v3
- **MCP SDK:** `@modelcontextprotocol/sdk` for server implementation
- **Vitest** for testing — native ESM + TypeScript support, Jest-compatible API
- **Node.js 20+** (CI and the Docker image use Node 20)
- **Rendering:** `highcharts-export-server` v5 (async API: `setOptions` → `initExport(options)` → `startExport(settings, cb)`), headless Chromium via Puppeteer
