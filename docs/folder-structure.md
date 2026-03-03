# Folder & File Structure — Highcharts MCP Server

This document outlines the **recommended structure** for your Highcharts MCP Server project — from core source code to tests, documentation, and deployment configuration.

The goals for this structure are:

* Clear **separation of concerns**
* Easy **navigation and maintenance**
* Support for **validation schemas**, AI tools, transports, and testing
* Alignment with production‑ready patterns used in TypeScript backend services ([Medium][2])

---

##  Root Directory

```
highchart-mcp-server/
├── docker/
├── docs/
├── src/
├── tests/
├── .env.example
├── .env.test
├── .gitignore
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

##  `docker/`

Contains containerization files for local development and production deployment.

```
docker/
├── Dockerfile
├── docker-compose.yml
└── nginx.conf         # Optional reverse proxy config
```

* **Dockerfile** — Multi‑stage Docker build config.
* **docker‑compose.yml** — For local stacks (e.g., server + monitoring).
* **nginx.conf** — Reverse proxy / SSL termination (optional).

---

## `docs/`

Project documentation:

```
docs/
├── roadmap.md
├── architecture.md
├── mcp-specification.md
```

* **roadmap.md** — Feature roadmap for MVP → Prod.
* **architecture.md** — System architecture doc.
* **mcp‑specification.md** — MCP protocol spec for this server.
* **contribution‑guidelines.md** — How to contribute.

Documentation provides context for developers and stakeholders. ([Howik][3])

---

## `src/`

All core application source files.

```
src/
├── config/
├── transports/
├── tools/
├── types/
├── validation/
├── services/
├── utils/
├── index.ts
└── server.ts
```

---

###  `src/config/`

Application and environment configuration.

```
src/config/
├── env.ts
├── index.ts
├── mcpConfig.ts
```

* **env.ts** — Loads `.env` into typed config.
* **mcpConfig.ts** — MCP server configs (port, retries, etc.).

---

###  `src/transports/`

Transport implementations for MCP. Each transport lives in its own subdirectory — the SDK provides complete transport classes, so our files are thin glue with room for transport-specific utilities.

```
src/transports/
├── stdio/
│   ├── index.ts
│   └── utils.ts
├── streamable/
│   ├── index.ts
│   ├── handlers.ts
│   └── utils.ts
├── sse/
│   ├── index.ts
│   └── utils.ts
└── index.ts
```

* **stdio/** — STDIO transport (primary). Zero-config, used by Claude Desktop, Cursor, and most MCP clients.
* **streamable/** — Streamable HTTP transport (secondary). Network transport that handles SSE fallback natively. `handlers.ts` contains the HTTP request handler factory (health, `/mcp`, 404 routing).
* **sse/** — SSE transport scaffold (placeholder). Standalone SSE is deprecated in the SDK — `StreamableHTTPServerTransport` handles SSE fallback internally.
* **index.ts** — Transport dispatcher that selects and starts the configured transport.

---

###  `src/tools/`

MCP tool definitions (each tool maps to a capability).

```
src/tools/
├── chart/
│   ├── createChart.ts
│   ├── exportChart.ts
│   └── validationTool.ts
├── ai/
│   ├── aiParser.ts
│   └── aiSuggestor.ts
└── index.ts
```

* **chart/** — Tools for Highcharts capabilities.
* **ai/** — Tools for AI‑assisted workflows (Natural language parsing, suggestions).
* **index.ts** — Registers all tools to MCP server.

Best practice is grouping tools by domain (chart, AI, etc.) for clarity and modularity. ([Medium][1])

---

###  `src/types/`

Shared TypeScript type definitions used across the application, organized by domain.

```
src/types/
├── chart.ts
└── index.ts
```

* **chart.ts** — Chart-related types and Zod schemas (ChartType, SeriesData, CreateChartInput, HighchartsConfig).
* **index.ts** — Barrel re-export from domain files. All consumers import from this barrel.

Co-locating shared types by domain avoids scattering type definitions across tools, validation, and services.

---

###  `src/validation/`

Validation schemas, organized per chart type.

```
src/validation/
├── schemas/
│   ├── lineChart.schema.ts
│   ├── pieChart.schema.ts
│   ├── barChart.schema.ts
│   └── index.ts
└── index.ts
```

* **schemas/** — Each chart type has its own Zod/JSON schema.
* **index.ts** — Re‑exports all schemas.

This modular schema design improves clarity and testability compared with monolithic files. ([Howik][3])

---

###  `src/services/`

Business logic and helpers for tools.

```
src/services/
├── chartService.ts
└── aiService.ts
```

* **chartService.ts** — Implements rendering and export logic.
* **aiService.ts** — Wraps AI model integration logic (NLP, suggestions).

---

###  `src/utils/`

Utility modules to be used across the app.

```
src/utils/
├── logger.ts
├── errorHandler.ts
└── responseFormatter.ts
```

* **logger.ts** — Structured logging implementation.
* **errorHandler.ts** — Standardized error object handling.
* **responseFormatter.ts** — Helper for consistent JSON responses.

This separation keeps core logic clean and focused. ([Medium][2])

---

##  `tests/`

All tests organized by type and scope.

```
tests/
├── unit/
│   ├── tools/
│   │   ├── createChart.spec.ts
│   │   └── validationTool.spec.ts
│   └── utils/
│       └── logger.spec.ts
├── integration/
│   ├── mcpServer.spec.ts
│   └── transport.spec.ts
└── e2e/
    └── endToEnd.spec.ts
```

* **unit/** — Isolated component tests.
* **integration/** — Validates module compositions (tools + transports).
* **e2e/** — Full stack tests simulating real clients.

Mirroring the `src/` structure inside `tests/` simplifies mapping code coverage and test ownership. ([Medium][2])

---

##  Environment & Config Files

```
.env.example       # Template for environment variables
.env.test          # CI/test environment variables
.gitignore
vitest.config.ts   # Vitest test runner config
tsconfig.json      # TypeScript compiler settings
```

* **.env.example** — Template for configuration keys.
* **vitest.config.ts** — Test configuration using Vitest (native ESM + TypeScript support).

---

##  File Hierarchy Summary

```
highchart-mcp-server/
├── docker/
├── docs/
├── src/
│   ├── config/
│   ├── transports/
│   ├── tools/
│   ├── types/
│   ├── validation/
│   ├── services/
│   └── utils/
├── tests/
├── .env.example
├── .env.test
├── .gitignore
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---
