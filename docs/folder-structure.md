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
├── jest.config.js
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
├── validation/
├── services/
├── middlewares/
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

Transport implementations for MCP (Streamable HTTP, SSE, STDIO).

```
src/transports/
├── streamable/
│   ├── index.ts
│   ├── handlers.ts
│   └── utils.ts
├── sse/
│   ├── index.ts
│   └── utils.ts
└── stdio/
    ├── index.ts
    └── utils.ts
```

* **streamable/** — Primary modern MCP transport.
* **sse/** — Optional legacy SSE support.
* **stdio/** — Local CLI / dev transport.

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

###  `src/middlewares/`

Reusable middleware logic (auth, rate limiting).

```
src/middlewares/
├── authMiddleware.ts
└── rateLimit.ts
```

* **authMiddleware.ts** — API key / JWT validation.
* **rateLimit.ts** — Protects against request spikes.

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
jest.config.js     # Jest test runner config
tsconfig.json      # TypeScript compiler settings
```

* **.env.example** — Template for configuration keys.
* **jest.config.js** — Test configuration for running various test suites.

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
│   ├── validation/
│   ├── services/
│   ├── middlewares/
│   └── utils/
├── tests/
├── .env.example
├── .env.test
├── .gitignore
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---
