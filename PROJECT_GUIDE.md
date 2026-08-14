# Highcharts MCP Server — Project Guide

> A single, detailed reference for humans **and** AI assistants. It explains what
> the project is, how it's built, how everything works, the conventions to
> follow, current status, and open questions. Hand this to an AI so it can reason
> about and extend the codebase.

---

## 1. What this is (TL;DR)

An **MCP (Model Context Protocol) server** that turns chart requests into
**validated Highcharts configurations** and **rendered images** (SVG / PNG /
PDF). Any MCP-capable client (Claude Desktop, Cursor, VS Code, custom apps) can
call its tools over **STDIO** (local) or **Streamable HTTP** (networked).

- **Language/runtime:** TypeScript (strict, ESM), Node.js 20+.
- **Validation:** Zod v4.
- **MCP:** `@modelcontextprotocol/sdk` (`McpServer`, `registerTool`).
- **Rendering:** `highcharts-export-server` v5 (headless Chromium via Puppeteer).
- **Coverage:** **all 70 Highcharts 12.x series types**, across 4 constructors
  (`chart`, `stockChart`, `mapChart`, `ganttChart`).
- **Tools (4):** `create_chart`, `render_chart`, `export_chart`, `list_chart_types`.
- **Extras:** offline render cache, Prometheus metrics + health, HTTP auth
  (API key / HS256 JWT) + scopes + rate limiting, per-session HTTP transport,
  export timeouts/limits, a `highchart-mcp` CLI, and JS/TS + Python SDKs.

---

## 2. Current status

| Phase | Scope | Status |
| --- | --- | --- |
| Phase 1 (MVP) | 3 tools, Zod validation, STDIO + HTTP transports | ✅ Done |
| Phase 2 (Scale & Security) | all 70 types, discovery, rendering/export, offline cache, metrics/health, auth + rate limiting, per-session HTTP, robustness limits, Docker + CI, licensing, docs, **CLI + JS/TS & Python SDKs** | ✅ Done |
| Phase 3 (AI & Productivity) | natural-language charting, AI suggestions/auto-correction, dashboards | ⏳ Not started |

**Tests:** 21 server/CLI spec files (~217 tests) + 5 JS SDK tests, all green;
`tsc` clean. Python SDK has offline unit tests + an opt-in e2e (run in CI).
A matrix test asserts **all 70 types build + validate**.

**Verified locally:** unit/integration suites, real multi-session HTTP (2
clients), real offline rendering (8/8 SVGs across all 4 constructors), the CLI.
**Validated in CI only (no network in the dev sandbox):** Docker image build,
`pip install mcp` + Python e2e.

---

## 3. Tech stack & key dependencies

- **`@modelcontextprotocol/sdk` ^1.25** — MCP server/client + transports
  (`StdioServerTransport`, `StreamableHTTPServerTransport`, `InMemoryTransport`).
- **`highcharts` ^12.5** — the charting library (scripts fetched/cached by the
  export server). **Proprietary** — see §14 Licensing.
- **`highcharts-export-server` ^5** — headless rendering (Puppeteer + Chromium).
  v5 module API: `setOptions(options)` → `initExport(options)` →
  `startExport(settings, cb)` → `killPool()`.
- **`zod` ^4.3 (`zod/v4`)** — schema validation. Note v4 API differs from v3.
- **Dev:** `typescript` ^5.9, `vitest` ^3, `tsx`, `@types/node`.

---

## 4. Repository layout

```
highchart-mcp-server/
├── src/
│   ├── index.ts                     # entrypoint: init export -> start transport -> shutdown hooks
│   ├── server.ts                    # createMcpServer() factory (registers all tools)
│   ├── config/
│   │   ├── env.ts                   # frozen `config` from env vars (all knobs)
│   │   └── index.ts
│   ├── charts/                      # CHART ENGINE
│   │   ├── types.ts                 # ChartFamily, HcConstructor, ChartFamilyInput, BuiltChart
│   │   ├── shared.ts                # seriesFamily() factory + flexiblePoint + enable3d
│   │   ├── registry.ts              # families lookup, generated union, buildFromInput, chartCatalog
│   │   ├── index.ts                 # barrel
│   │   └── families/                # 15 families covering all 70 types
│   │       ├── cartesian.ts range.ts named.ts xyz.ts financial.ts flags.ts
│   │       ├── heatmapGrid.ts hierarchical.ts nodeLink.ts gauge.ts statistical.ts
│   │       ├── distribution.ts xrange.ts maps.ts gantt.ts
│   │       └── index.ts             # `families` array (registration point)
│   ├── tools/
│   │   ├── index.ts                 # registerAllTools()
│   │   └── chart/                   # createChart, renderChart, exportChart, listChartTypes
│   ├── services/
│   │   ├── exportService.ts         # export-server wrapper (init/shutdown/export, credits, timeout, metrics)
│   │   └── index.ts
│   ├── transports/
│   │   ├── index.ts                 # startTransport(serverFactory) switch
│   │   ├── stdio/index.ts           # STDIO
│   │   └── streamable/              # HTTP
│   │       ├── index.ts             # http server + session manager wiring
│   │       ├── handlers.ts          # routing + auth + rate limit + /health + /metrics + body limit
│   │       └── sessionManager.ts    # per-session McpServer + transport
│   ├── auth/                        # apiKey.ts, jwt.ts (HS256), types.ts, index.ts (+ scopes)
│   ├── middleware/rateLimit.ts      # token-bucket limiter
│   ├── metrics/                     # registry.ts (counters/histograms/gauges + Prometheus) + index.ts
│   ├── types/                       # chart.ts (Zod schemas for raw tools), exportServer.d.ts, index.ts
│   └── utils/                       # logger.ts (stderr), errorHandler.ts, responseFormatter.ts, index.ts
├── packages/
│   ├── sdk-js/                      # @highchart-mcp/sdk (TypeScript client)
│   └── sdk-python/                  # highchart-mcp-sdk (async Python client)
├── scripts/                         # highcharts-mirror.mjs, seed-cache.mjs, render-samples.mjs
├── tests/                           # unit/ + integration/ (vitest)
├── docker/                          # Dockerfile, docker-compose.yml
├── .github/workflows/ci.yml         # build+test, JS SDK, Python SDK, docker build
├── docs/                            # (git-ignored) legacy planning notes
├── roadmap-phase-2/                 # (git-ignored) detailed milestone tracker
├── CLAUDE.md README.md DEPLOYMENT.md LICENSING.md PROJECT_GUIDE.md
├── package.json (workspaces + bin: highchart-mcp) / package-lock.json
├── tsconfig.json (rootDir src) / vitest.config.ts / mcp.json / .env.example
```

Notes:
- **No `src/validation/`** — validation lives in `src/charts/` (per-family Zod
  schemas + generated union) and `src/types/chart.ts` (raw-tool schemas).
- `docs/` and `roadmap-phase-2/` are **git-ignored** (local planning only).

---

## 5. Runtime architecture & request flow

### Startup (`src/index.ts`)
1. `initExportService()` — configure + warm the Highcharts export pool.
2. `startTransport(createMcpServer)` — STDIO or HTTP based on `config.TRANSPORT`.
3. Optional metrics snapshot timer (STDIO); SIGINT/SIGTERM → graceful shutdown.

### STDIO (primary, local)
- One `McpServer` (from `createMcpServer()`) connected to a `StdioServerTransport`.
- **No auth** (local, trusted). Logs go to **stderr** so stdout stays clean for
  the JSON-RPC protocol (verified — nothing leaks to stdout).

### Streamable HTTP (networked) — `src/transports/streamable/`
Per-request pipeline in `handlers.ts`:
```
GET  /health   -> open (status, version, uptime)
GET  /metrics  -> Prometheus text (auth unless METRICS_PUBLIC; never rate-limited)
POST /mcp      -> [body-size limit 413] -> [auth 401/403] -> [rate limit 429] -> sessionManager
GET/DELETE /mcp-> routed to the session's transport by `mcp-session-id`
*              -> 404
```
- **`sessionManager.ts`** keeps **one `McpServer` + `StreamableHTTPServerTransport`
  per `mcp-session-id`**. A session is created on an initialize POST (no id),
  cleaned up on transport `close`, and capped by `HTTP_MAX_SESSIONS` (→ 503).
  An McpServer binds to a single transport, hence one per session.

---

## 6. Chart engine (the core) — `src/charts/`

### Concepts
- Every Highcharts **series type** belongs to a **family** that shares an input
  **data shape** and a **constructor**.
- `ChartFamily` (`types.ts`): `{ id, memberTypes[], constr, inputSchema (ZodObject),
  build(input)->options, needsColorAxis?, description, dataShapeHint, example }`.
- `seriesFamily()` (`shared.ts`) is a factory for the common
  "chart + array of series of points" shape (used by most families). `flexiblePoint`
  accepts number | numeric-tuple | point-object; families set stricter schemas
  where useful. `enable3d()` adds a 3D scene for cylinder/scatter3d/*3d.
- `registry.ts`:
  - `families` (from `families/index.ts`) → `typeToFamily` map (dupes throw at load).
  - `getFamilyForType(type)`, `allChartTypes()` (70).
  - **`CreateChartInputSchema`** — a **discriminated union on `type`** generated by
    extending each family's schema with `type: z.literal(t)`.
  - `buildFromInput(input)` → `{ options, constr }` (dispatches to the family builder).
  - `chartCatalog()` → per-family metadata for `list_chart_types`.

### The 15 families → 70 types

| Family | constr | Types | Data shape |
| --- | --- | --- | --- |
| cartesian | chart | line, spline, area, areaspline, column, bar, scatter, polygon, streamgraph, columnpyramid, waterfall, dotplot, cylinder, lollipop | `number[]` / `[x,y]` / `{x?,y}` |
| range | chart | arearange, areasplinerange, columnrange, errorbar | `[x,low,high]` |
| named | chart | pie, variablepie, funnel, funnel3d, pyramid, pyramid3d, item, wordcloud | `{name,y}` (wordcloud `{name,weight}`) |
| xyz | chart | bubble, packedbubble, scatter3d | `[x,y,z]` |
| financial | **stockChart** | ohlc, hlc, candlestick, hollowcandlestick, heikinashi, renko, pointandfigure | `[x,open,high,low,close]` |
| flags | **stockChart** | flags | `{x,title,text}` |
| heatmapGrid | chart (colorAxis) | heatmap, tilemap | `[x,y,value]` |
| hierarchical | chart | treemap, sunburst, treegraph | `{id,parent?,name?,value?}` |
| nodeLink | chart | sankey, dependencywheel, networkgraph, organization, arcdiagram | `{from,to,weight?}` |
| gauge | chart | gauge, solidgauge | `number` |
| statistical | chart | boxplot, variwide, vector, windbarb, dumbbell, bullet, venn, pictorial | varies (see hints) |
| distribution | chart | histogram, bellcurve, pareto | `{ baseData: number[] }` (derived) |
| xrange | chart | xrange, timeline | `{x,x2,y}` |
| maps | **mapChart** (colorAxis) | map, mapline, mappoint, mapbubble, geoheatmap, tiledwebmap, flowmap | `{topology, data[]}` (caller-supplied GeoJSON/TopoJSON) |
| gantt | **ganttChart** | gantt | `{ tasks:[{name,start,end,dependency?,parent?}] }` |

### How `create_chart` publishes its schema (important nuance)
The MCP SDK only emits a JSON schema for **object** schemas, not unions. So
`create_chart` **advertises an object** (a `type` enum of all 70 + optional
family fields) for discovery, and does **precise per-type validation inside the
handler** via `CreateChartInputSchema` (the registry union). Errors from that
union carry per-type messages (e.g. distribution requires `baseData`, gantt
requires `tasks`).

### How to add a new chart type
1. Pick/author a family in `src/charts/families/` (use `seriesFamily()` when the
   shape fits; otherwise a full `ChartFamily` like `maps.ts`/`gantt.ts`).
2. Add the type to that family's `memberTypes`.
3. Register the family in `families/index.ts` (if new).
4. If it needs a JS field not already on the advertised object schema, add it to
   `CreateChartToolSchema` in `src/tools/chart/createChart.ts`.
5. The matrix test (`tests/unit/charts/matrix.spec.ts`) will assert it builds.

---

## 7. MCP tools (contracts)

All tool results are MCP `CallToolResult`s. JSON results are returned as a single
**text** content block containing JSON (see `utils/responseFormatter.ts`). Errors
set `isError: true` (via `handleToolError`).

### `create_chart`
- **Input:** `{ type, title?, subtitle?, xAxisCategories?, series?, baseData?,
  tasks?, topology?, joinBy?, provider?, data?, format? }` (+ passthrough).
- **Output:** `{ constr, options }` (the Highcharts config), or a **render result**
  `{ config, format, data }` when `format` (svg/png/pdf) is given.

### `render_chart`
- **Input:** `{ chartOptions: { chart:{type}, series[], ... }, format? (svg), constr? }`.
- **Output:** `{ config, format, data }`. Passes arbitrary Highcharts options through.

### `export_chart`
- **Input:** `{ chartOptions, format, constr?, width?, height?, scale? }`.
- **Output:** `{ config, format, data }`.

### `list_chart_types`
- **Input:** `{ family? }`.
- **Output:** `{ totalTypes: 70, totalFamilies, families: [{ family, constr, types[],
  needsColorAxis, description, dataShapeHint, example }] }`.

Example `create_chart` input:
```json
{ "type":"line", "title":"Sales", "xAxisCategories":["Jan","Feb","Mar"],
  "series":[{ "name":"Revenue", "data":[10,20,15] }] }
```

---

## 8. Rendering pipeline — `src/services/exportService.ts`

- **Init:** `setOptions({ pool:{minWorkers:1,maxWorkers:EXPORT_MAX_WORKERS},
  logging:{level:1}, other:{noLogo:true}, puppeteer?:{args:PUPPETEER_ARGS},
  highcharts?:{cdnURL,cachePath,forceFetch} })` → `await initExport(settings)`.
- **Export:** builds `settings.export = { type(format), options(chartOptions),
  constr, width?, height?, scale? }`, injects **credits** (see §14), then
  `startExport` wrapped in an **`EXPORT_TIMEOUT_MS` race** (rejects + records a
  `timeout` metric if it hangs). PNG/PDF come back **base64**; SVG is text.
- **Constructor selection:** `create_chart` passes the family's `constr`
  automatically; raw tools accept an explicit `constr`.

### Offline Highcharts cache
The export server fetches Highcharts scripts from a CDN on first init and caches
them. For offline/air-gapped use:
- `npm run seed:cache` — starts a local static **mirror** of the installed
  `highcharts` package (`scripts/highcharts-mirror.mjs`) and seeds the cache via
  `HIGHCHARTS_CDN_URL` pointing at it (`scripts/seed-cache.mjs`).
- `npm run render:samples` — renders one SVG per constructor to `.render-samples/`.
- The **Docker image bakes this cache at build** (no CDN at runtime).
- `cachePath` is resolved **relative to the export-server package dir**; the repo
  uses `../../.hc-cache` (→ repo root).

---

## 9. Configuration reference (env vars → `src/config/env.ts`)

All config is read once into a frozen `config` object. See `.env.example`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | env label |
| `LOG_LEVEL` | `info` | debug/info/warn/error |
| `HIGHCHARTS_CDN_URL` | _(unset)_ | script source; unset = official CDN |
| `HIGHCHARTS_CACHE_PATH` | _(unset)_ | cache dir (relative to export-server pkg) |
| `HIGHCHARTS_FORCE_FETCH` | `false` | re-fetch scripts each start |
| `EXPORT_TIMEOUT_MS` | `30000` | abort a hung export |
| `EXPORT_MAX_WORKERS` | `2` | concurrent renders |
| `PUPPETEER_ARGS` | _(none)_ | extra Chromium args (containers: `--no-sandbox,...`) |
| `HTTP_MAX_BODY_BYTES` | `5000000` | reject larger `/mcp` bodies (413) |
| `HTTP_MAX_SESSIONS` | `100` | cap concurrent HTTP sessions (503) |
| `AUTH_STRATEGY` | `none` | `none`/`apikey`/`jwt` |
| `API_KEYS` | _(unset)_ | `key` or `id:key` or `id:key:scope1\|scope2`, comma-separated |
| `JWT_SECRET` | _(unset)_ | HS256 secret (jwt) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | _(unset)_ | optional JWT claim checks |
| `AUTH_REQUIRED_SCOPES` | _(none)_ | scopes every request must hold (csv) |
| `RATE_LIMIT_ENABLED` | `false` | enable token bucket |
| `RATE_LIMIT_RPM` | `120` | sustained requests/min per client |
| `RATE_LIMIT_BURST` | `20` | bucket capacity |
| `METRICS_ENABLED` | `true` | collect + serve `/metrics` |
| `METRICS_PUBLIC` | `false` | serve `/metrics` without auth |
| `METRICS_LOG_INTERVAL_MS` | `0` | STDIO metrics snapshot interval (0 = off) |
| `HIGHCHARTS_LICENSE_ID` | _(unset)_ | license attestation; required to disable credits |
| `HIGHCHARTS_CREDITS_ENABLED` | `true` | show Highcharts credit; forced `true` w/o license id |

---

## 10. Security (HTTP only) — `src/auth/`, `src/middleware/`

- **STDIO has no auth** by design (local, trusted).
- **Authenticators:** `none`, `apikey` (Bearer / `x-api-key`, timing-safe compare,
  per-key scopes), `jwt` (dependency-free **HS256**: signature + `exp`/`nbf` +
  optional `iss`/`aud`, scopes from `scope`/`scp`). Scope enforcement via
  `requireScopes` + `AUTH_REQUIRED_SCOPES`.
- **Rate limiting:** in-process **token bucket** keyed by subject (authenticated)
  else client IP; returns `429` + `Retry-After`. Per-process only (multi-instance
  needs a shared store — not implemented).
- **Applied:** `/mcp` (auth + rate limit), `/metrics` (auth unless public),
  `/health` (always open); plus the `413` body-size guard.

---

## 11. Observability — `src/metrics/`

- Dependency-free registry: counters/histograms/gauges + Prometheus renderer +
  JSON `snapshot()`.
- Metrics: `highchart_tool_invocations_total{tool,status}`,
  `highchart_errors_total{tool}`, `highchart_exports_total{format,constr,status}`
  (incl. `status=timeout`), `highchart_export_duration_seconds{format}` (histogram),
  `highchart_export_pool_workers`, `highchart_active_sessions`,
  `highchart_rate_limited_total`, `highchart_auth_failures_total{status}`,
  `highchart_uptime_seconds`.
- Endpoints: `GET /health` (status, version, uptime), `GET /metrics` (Prometheus).

---

## 12. Robustness / limits
Export timeout, configurable worker pool, HTTP body-size cap (413), session cap
(503), graceful shutdown (closes sessions + export pool).

---

## 13. CLI — `highchart-mcp` (`src/cli/`)
In-process (reuses the registry + export service; no MCP round-trip). Built to
`dist/cli/index.js` (bin). Commands: `create`, `render`, `export`, `list-types`,
`serve`, `--help/--version`. Input from file or `-` (stdin); output to `--out`
(SVG text / base64 decoded) or stdout. `render`/`export`/`serve` need a seeded
cache or network.

---

## 14. Licensing (Highcharts) — `LICENSING.md`
Highcharts is **proprietary**: free for **non-commercial** use **with the credit
attribution kept**, paid license required for commercial/production. This server
is **compliant by default** — credits are ON; they can only be disabled when
`HIGHCHARTS_LICENSE_ID` is set (otherwise forced back on). `applyCredits()` in
`exportService.ts` injects `credits.enabled` unless the caller set `credits`.

---

## 15. SDKs — `packages/`

### JS/TS: `@highchart-mcp/sdk` (`packages/sdk-js`)
`HighchartClient.connect(transport)` / `connectHttp(url, {apiKey,headers})` /
`connectStdio({command,args,env})`; methods `createChart`, `renderChart`,
`exportChart`, `listChartTypes`, `close`. **Self-contained types** (decoupled from
server internals). Tool errors throw `HighchartToolError`. Own `tsc`/`vitest`.

### Python: `highchart-mcp-sdk` (`packages/sdk-python`)
Async `HighchartClient.connect_stdio(...)` / `connect_http(...)` context managers
over the official `mcp` client; mirrored methods. **`mcp` is lazy-imported** so the
package imports/unit-tests offline. hatchling packaging; pytest (+ opt-in e2e via
`RUN_PY_E2E`). Not published.

---

## 16. Testing — `tests/` (Vitest) + package suites
- Unit: charts (registry, matrix of all 70), tools schemas, services (export incl.
  timeout/constr/credits/config), metrics, auth (apiKey/jwt), rate limiter,
  session-manager routing, cli, utils.
- Integration: `mcpServer` (4 tools via in-memory), `httpEndpoints` (health/metrics/413),
  `httpAuth` (401/429/open health), `httpMultiSession` (real 2-client isolation).
- The export server is **mocked** in tests (no Chromium needed).
- Run: `npm test` (server + CLI); `npm test -w @highchart-mcp/sdk` (JS SDK);
  `pytest packages/sdk-python` (Python).

---

## 17. Build & run
```bash
npm ci
npm run build           # tsc (server + CLI) -> dist/
npm start               # node dist/index.js (STDIO by default)
TRANSPORT=http PORT=3000 node dist/index.js   # HTTP

npm run dev             # tsx --watch src/index.ts
npm run seed:cache      # offline render cache
npm run render:samples  # sanity renders -> .render-samples/
```

---

## 18. Docker / Deployment / CI — `docker/`, `.github/`, `DEPLOYMENT.md`
- **Dockerfile:** multi-stage; slim runtime with **distro Chromium**
  (`PUPPETEER_EXECUTABLE_PATH`), bakes the render cache offline, non-root user,
  `HEALTHCHECK` on `/health`, `TRANSPORT=http`.
- **Compose:** `docker/docker-compose.yml` (`shm_size: 512m`, health, env hints).
- **Hosting:** any container/VM platform (Fly.io, Railway, Render, Cloud Run w/
  min-instances, ECS/Fargate, Azure Container Apps, k8s, or a VM behind nginx).
  Not pure-serverless (long-lived process + Chromium). ~512 MB–1 GB RAM.
- **CI (`ci.yml`):** build+test (server/CLI), JS SDK build+test, Python SDK
  pytest, and a Docker build job.

---

## 19. Conventions & code style (follow these when extending)
- **ESM only** (`"type":"module"`); use `import`/`export`, `.js` specifiers in TS
  imports (NodeNext). `verbatimModuleSyntax` → use `import type` for types.
- **Strict TS**, `noUncheckedIndexedAccess`; avoid `any` (prefer `unknown` +
  narrowing). Config is a frozen object read once from env.
- **Zod v4** (`import { z } from 'zod/v4'`). Give user-facing schemas clear
  `error` messages.
- **Tools**: wrap handlers in `handleToolError(name, fn)`; return via
  `jsonResult` / `chartRenderResult` / `errorResult`.
- **Logging** goes to **stderr** (`logger`) — never stdout (protocol safety).
- **MCP**: use `McpServer` + `registerTool`; a server binds to one transport
  (fresh server per HTTP session). Use `InMemoryTransport` in tests.
- **Commits**: small, modular, conventional (`feat(...)`, `fix(...)`, `docs:`...).
  Build + test must stay green. Don't commit unless asked.
- **SDKs stay decoupled** (self-contained types).

---

## 20. Known limitations & caveats
- **Rate limiting is per-process** — multiple replicas need a shared store (Redis).
- **JWT is HS256 only** — RS256/JWKS/OAuth flows not implemented (front with a
  proxy or extend with `jose`).
- **Rendered images are returned as text/JSON (base64 for PNG/PDF)**, not MCP
  `image` content — larger payloads; clients can't inline-render.
- **Maps require caller-supplied topology** (no bundled/fetched map collections).
- **Highcharts license** is a legal/commercial obligation for production.
- **Dev-sandbox unverified (works in CI):** Docker build, `pip install mcp`,
  Python e2e — all need network/Chromium.
- **`create_chart` validation errors** surface as a Zod-issue JSON blob (verbose).

---

## 21. Roadmap / open questions (good things to ask the AI about)
**Phase 3 candidates:** natural-language → chart config; AI chart-type
suggestions; auto-correction of invalid configs; dashboards / multi-chart layouts;
scheduled/batch exports.

**Hardening/ops backlog:** shared-store rate limiting; RS256/JWKS/OAuth; MCP
`image` content type for rendered output; DNS-rebinding/allowed-origins hardening;
publishing pipelines (npm `@highchart-mcp/sdk`, PyPI `highchart-mcp-sdk`);
coverage thresholds; structured/user-friendly validation errors.

**Questions worth resolving before Phase 3:**
- Which AI provider/model for NL charting, and where does inference run (in-server
  tool vs. client-side)?
- Do we introduce persistence (chart history, templates)? If so, what store?
- Multi-tenant model: API keys per tenant + quotas? shared rate-limit store?
- Publish cadence/versioning for the SDKs and the server image.

---

## 22. Quick pointers (where to look)
- Add a chart type → `src/charts/families/*` + `families/index.ts`.
- Change tool behavior → `src/tools/chart/*`.
- Rendering/export/timeouts/credits → `src/services/exportService.ts`.
- HTTP auth/limits/routing → `src/transports/streamable/handlers.ts`,
  `src/auth/*`, `src/middleware/rateLimit.ts`.
- Sessions → `src/transports/streamable/sessionManager.ts`.
- Config knobs → `src/config/env.ts` (+ document in `.env.example`).
- Metrics → `src/metrics/registry.ts`.
- CLI → `src/cli/*`. SDKs → `packages/sdk-js`, `packages/sdk-python`.
