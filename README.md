# Highcharts MCP Server

A **Model Context Protocol (MCP)** server that turns structured input or raw
Highcharts options into validated chart configurations and rendered images
(SVG / PNG / PDF). It works with any MCP-capable client (Claude Desktop, Cursor,
VS Code, etc.) over **STDIO** or **Streamable HTTP**.

> **Status:** actively developed. Chart generation, rendering/export, discovery,
> metrics, auth + rate limiting (HTTP), and Docker packaging are implemented and
> tested. The server/CLI and both SDKs are published (see [Packages](#packages)).

## Packages

| Package | Registry | Install |
| --- | --- | --- |
| [`highchart-mcp-server`](https://www.npmjs.com/package/highchart-mcp-server) | npm | `npm install -g highchart-mcp-server` (provides the `highchart-mcp` CLI + server) |
| [`@highchart-mcp/sdk`](https://www.npmjs.com/package/@highchart-mcp/sdk) | npm | `npm install @highchart-mcp/sdk` |
| [`highchart-mcp-sdk`](https://pypi.org/project/highchart-mcp-sdk/) | PyPI | `pip install highchart-mcp-sdk` |

## Features

- **All 70 Highcharts 12.x series types** — cartesian, pie/funnel, bubble,
  financial (candlestick/OHLC, `stockChart`), heatmap/tilemap, treemap/sunburst,
  sankey/networkgraph/organization, gauges, boxplot/statistical, xrange/timeline,
  **maps** (`mapChart`), and **gantt** (`ganttChart`).
- **Two-tier tools** — a guided `create_chart` plus raw passthrough
  `render_chart` / `export_chart` for full Highcharts control.
- **Discovery** — `list_chart_types` returns every type grouped by family with
  data-shape hints and examples.
- **Rendering** to SVG / PNG / PDF via `highcharts-export-server` (headless
  Chromium), with the correct constructor selected automatically.
- **Zod v4 validation** with clear, per-type error messages.
- **Production hardening** — export timeouts, configurable worker pool, request
  body limits, and per-session HTTP transport management.
- **Security (HTTP)** — API-key or HS256-JWT auth with scopes, and token-bucket
  rate limiting.
- **Observability** — `GET /health` and Prometheus `GET /metrics`.
- **Docker image** that bakes the Highcharts script cache offline (no CDN needed
  at runtime).

## Tools

| Tool | Purpose |
| --- | --- |
| `create_chart` | Build a Highcharts config from structured input for any supported type. Returns `{ constr, options }`, or a rendered image when `format` is given. |
| `render_chart` | Render a full Highcharts options object (any type). Returns config + rendered output. |
| `export_chart` | Like `render_chart` with `format` (svg/png/pdf) plus `width`/`height`/`scale` and `constr` overrides. |
| `list_chart_types` | List every supported chart type grouped by family, with data shapes and examples. |

## Install

Requires **Node.js 20+**.

**From npm** (published package — no clone needed):

```bash
npm install -g highchart-mcp-server
highchart-mcp serve --transport stdio   # or: highchart-mcp serve --transport http --port 3000
```

**From source** (for development or Docker packaging):

```bash
npm ci
npm run build
npm start
```

## Usage

### Local (STDIO) — desktop AI clients

`mcp.json` (or Claude Desktop / Cursor config):

```json
{
  "mcpServers": {
    "highchart-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/highchart-mcp-server/dist/index.js"],
      "env": { "TRANSPORT": "stdio", "LOG_LEVEL": "info" }
    }
  }
}
```

### Networked (Streamable HTTP)

```bash
TRANSPORT=http PORT=3000 node dist/index.js
# MCP endpoint: POST http://localhost:3000/mcp
# Health:       GET  http://localhost:3000/health
# Metrics:      GET  http://localhost:3000/metrics
```

Enable auth + rate limiting for any network exposure (see below).

### Example: `create_chart`

```json
{
  "type": "line",
  "title": "Monthly Sales",
  "xAxisCategories": ["Jan", "Feb", "Mar"],
  "series": [{ "name": "Revenue", "data": [10, 20, 15] }]
}
```

Call `list_chart_types` to discover the expected data shape for any type
(e.g. financial `[x, open, high, low, close]`, heatmap `[x, y, value]`,
sankey `{ from, to, weight }`, gantt `tasks[]`, maps `topology` + `data`).

## Rendering (offline)

Rendering uses `highcharts-export-server` (headless Chromium), which fetches
Highcharts scripts from a CDN on first run and caches them. To work offline, the
scripts are sourced from the installed `highcharts` package:

```bash
npm run seed:cache      # populate the cache from the local package (no network)
npm run render:samples  # render one SVG per constructor to .render-samples/
```

The Docker image bakes this cache at build time. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Configuration

All configuration is via environment variables — see [`.env.example`](./.env.example).
Highlights:

| Area | Variables |
| --- | --- |
| Transport | `TRANSPORT` (`stdio`/`http`), `PORT`, `LOG_LEVEL` |
| Rendering | `EXPORT_TIMEOUT_MS`, `EXPORT_MAX_WORKERS`, `PUPPETEER_ARGS`, `HIGHCHARTS_CDN_URL`, `HIGHCHARTS_CACHE_PATH` |
| HTTP limits | `HTTP_MAX_BODY_BYTES`, `HTTP_MAX_SESSIONS` |
| Auth | `AUTH_STRATEGY` (`none`/`apikey`/`jwt`), `API_KEYS`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `AUTH_REQUIRED_SCOPES` |
| Rate limit | `RATE_LIMIT_ENABLED`, `RATE_LIMIT_RPM`, `RATE_LIMIT_BURST` |
| Metrics | `METRICS_ENABLED`, `METRICS_PUBLIC`, `METRICS_LOG_INTERVAL_MS` |
| Licensing | `HIGHCHARTS_LICENSE_ID`, `HIGHCHARTS_CREDITS_ENABLED` (see [LICENSING.md](./LICENSING.md)) |

## Deployment

Docker:

```bash
docker build -t highchart-mcp-server .
docker run -p 3000:3000 -e AUTH_STRATEGY=apikey -e API_KEYS=client1:changeme \
  --shm-size=512m highchart-mcp-server
# or: docker compose -f docker/docker-compose.yml up --build
```

Hosting options, resource guidance, and reverse-proxy/TLS notes are in
[DEPLOYMENT.md](./DEPLOYMENT.md).

## CLI

The build installs a `highchart-mcp` CLI (bin → `dist/cli/index.js`):

```bash
highchart-mcp list-types                 # list all types grouped by family
highchart-mcp list-types --family maps --json
echo '{"series":[{"data":[1,2,3]}]}' | highchart-mcp create --type line --input -
highchart-mcp create --type line --input chart.json --format svg --out chart.svg
highchart-mcp render --input options.json --format png --out chart.png
highchart-mcp export --input options.json --format pdf --width 1000 --out chart.pdf
highchart-mcp serve --transport http --port 3000
```

`render`/`export` require a seeded render cache (`npm run seed:cache`) or network.

## SDKs

Published client libraries (source in `packages/`, in-repo npm workspaces):

- **JS/TS:** [`@highchart-mcp/sdk`](https://www.npmjs.com/package/@highchart-mcp/sdk) ([source](./packages/sdk-js/README.md))
  ```bash
  npm install @highchart-mcp/sdk
  ```
  ```ts
  import { HighchartClient } from '@highchart-mcp/sdk';
  const client = await HighchartClient.connectHttp('http://localhost:3000/mcp', { apiKey });
  const { options } = await client.createChart({ type: 'line', series: [{ data: [1, 2, 3] }] });
  ```
- **Python:** [`highchart-mcp-sdk`](https://pypi.org/project/highchart-mcp-sdk/) ([source](./packages/sdk-python/README.md))
  ```bash
  pip install highchart-mcp-sdk
  ```
  ```python
  async with HighchartClient.connect_stdio(command="node", args=["dist/index.js"]) as client:
      cfg = await client.create_chart(type="line", series=[{"data": [1, 2, 3]}])
  ```

## Development

```bash
npm run dev    # tsx --watch src/index.ts
npm run build  # tsc (server + CLI)
npm test       # vitest run (server + CLI)

npm run build --workspace @highchart-mcp/sdk   # build the JS/TS SDK
npm test  --workspace @highchart-mcp/sdk       # test the JS/TS SDK
```

## Versioning & Publishing

All three published packages are versioned independently with
[semver](https://semver.org/), each in its own `package.json` /
`pyproject.toml`:

| Package | Version file |
| --- | --- |
| `highchart-mcp-server` | [`package.json`](./package.json) |
| `@highchart-mcp/sdk` | [`packages/sdk-js/package.json`](./packages/sdk-js/package.json) |
| `highchart-mcp-sdk` | [`packages/sdk-python/pyproject.toml`](./packages/sdk-python/pyproject.toml) |

**Rule: bump the version of every package you change before publishing —
never publish the same version twice.** Patch (`x.y.Z`) for fixes, minor
(`x.Y.0`) for backwards-compatible features/additions, major (`X.0.0`) for
breaking changes. A change to `src/**` bumps `highchart-mcp-server`; a change
to `packages/sdk-js/**` bumps `@highchart-mcp/sdk`; a change to
`packages/sdk-python/**` bumps `highchart-mcp-sdk`. Shared/cross-cutting
changes (e.g. a protocol change affecting the tools) bump all affected
packages together.

To publish a new version:

```bash
# 1. Bump the version(s) that changed, build, and test.
npm version <patch|minor|major> --no-git-tag-version        # root package
npm version <patch|minor|major> --no-git-tag-version -w @highchart-mcp/sdk
# packages/sdk-python/pyproject.toml: bump `version = "..."` by hand

npm run build && npm test
npm run build -w @highchart-mcp/sdk && npm test -w @highchart-mcp/sdk

# 2. Publish (npm requires an OTP if 2FA is enabled).
npm publish --otp=<code>
npm publish -w @highchart-mcp/sdk --otp=<code>

# 3. Publish the Python SDK.
cd packages/sdk-python
rm -rf dist && python -m build
twine check dist/*
twine upload dist/*   # __token__ / a PyPI API token
```

Commit the version bump(s) (e.g. `chore(release): highchart-mcp-server@1.1.0`)
alongside or right after the code change that motivated them.

## Licensing

This wrapper is under the license in `package.json`. **Highcharts itself is
proprietary**: free for non-commercial use with the credit attribution kept on
(the default here), and requires a paid license for commercial/production use.
See [LICENSING.md](./LICENSING.md).

## Roadmap

- **Done:** full chart-type coverage, rendering/export, discovery, offline cache,
  metrics/health, HTTP auth + rate limiting, per-session transport, robustness
  limits, Docker + CI, **CLI + JS/TS & Python SDKs**.
- **Next (Phase 3):** optional AI / natural-language features.
