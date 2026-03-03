# Architecture — Highcharts MCP Server

This document defines the architecture for the **Highcharts MCP Server** — a server that exposes Highcharts charting capabilities over the Model Context Protocol (MCP) for integration with AI clients. It describes the MVP foundation, extension for scale & security, and advanced AI‑centric features.

---

## Background: MCP Architectural Context

MCP (Model Context Protocol) is a **client‑host‑server protocol** that enables AI applications (hosts) to discover and interact with external services (servers) through MCP clients. MCP uses JSON‑RPC 2.0 messaging and abstracts transport mechanisms (e.g., STDIO, Streamable HTTP, SSE) so that servers can expose tools, resources, and prompts to AI clients in a standardized way. ([modelcontextprotocol.io][1])

At its core, MCP architecture comprises:

* **MCP Host** — The AI application with user orchestration logic.
* **MCP Client** — A bridge that translates between the host and MCP server.
* **MCP Server** — Provides tools (e.g., chart generation), resources, and prompts for AI consumption. ([modelcontextprotocol.io][1])

Your Highcharts MCP Server acts as the MCP server, providing charting primitives to host AI clients through tools.

---

## System Overview

### High‑Level Components

```
+--------------------+           +----------------------+
|    AI Host         |           |   Highcharts MCP     |
|  (Client UI,       | <—— JSON‑RPC / Streamable HTTP —> |     Server         |
|   Claude, ChatGPT) |                                   |   (Tool Backend)   |
+--------------------+                                   +----------------------+
                ^                                   ^
                |                                   |
           MCP Client                          Tool Registry, Schema Validation
         (client library)                      Chart Engine, Export Renderer
                ^                                   ^
                +—————————————— Logging, Metrics, Security, AI Services ——————+
```

Key architectural layers include:

1. **Transport Layer**
   MCP transports (STDIO for local clients, Streamable HTTP for network access). ([modelcontextprotocol.io][2])

2. **Protocol Layer**
   JSON‑RPC messaging and capability negotiation between client and server. ([modelcontextprotocol.io][1])

3. **Tool Layer**
   Exposed MCP tools (create_chart, validate_config, export_chart, etc.).

4. **Validation Layer**
   Schema enforcement for chart configurations (Zod/JSON Schema).

5. **Rendering Services**
   Highcharts engine and export engines.

6. **Security & Observability**
   Authentication, authorization, rate limits, metrics, logs.

---

## Architecture Phases

---

## Phase 1 — MVP (Minimum Viable Product)

### Objective

Build an MCP server that can reliably generate Highcharts charts with basic transport support and validation.

### Components

```
┌─────────────────────────────┐
|      Transport Layer        |
|  STDIO (primary)            |
|  Streamable HTTP (secondary)|
├─────────────────────────────┤
|      MCP Server Core        |
|  - McpServer (SDK class)    |
|  - Capability negotiation   |
|  - Tool registry            |
├─────────────────────────────┤
|      Validation Layer       |
|  - Zod/JSON Schemas         |
|  - Error formatting         |
├─────────────────────────────┤
|     Chart Rendering Core    |
|  - Highcharts chart engine  |
|  - Chart config handler     |
└─────────────────────────────┘
```

### SDK Notes

* Use **`McpServer`** (from `@modelcontextprotocol/sdk/server/mcp.js`), not the lower-level `Server` class.
* Register tools via **`server.tool()`** — the high-level API on `McpServer`.
* Use **`InMemoryTransport`** (from `@modelcontextprotocol/sdk/inMemory.js`) for unit/integration testing without real transports.

### Explanation

#### Transport Layer

The Phase 1 MCP server supports two transports:

* **STDIO (primary)** — Zero-config transport via `StdioServerTransport`. Claude Desktop, Cursor, and most MCP clients connect over STDIO. This is the fastest path to a testable server.
* **Streamable HTTP (secondary)** — Network transport via `StreamableHTTPServerTransport`. Handles both streaming and SSE fallback natively — no standalone SSE transport needed.

> **Note:** The standalone `SSEServerTransport` is deprecated in the SDK. `StreamableHTTPServerTransport` handles SSE fallback internally.

#### MCP Server Core

* **Capability Negotiation** — The server advertises its supported tools and features to the MCP client during connection.
* **Tool Registry** — A registry of charting tools available to clients (e.g., create_chart).
* **Middleware** — Handles request/response standardization, errors, logging.

This layer implements **JSON‑RPC messaging** and serves as the bridge to the internal features.

#### Validation Layer

Schema enforcement is critical to guarantee that chart configurations are correct before rendering. Use Zod or JSON Schema for strong, typed validation rules. Each chart type should have its own schema file (e.g., `pieChart.schema.ts`). This modular schema organization improves maintainability as the number of chart types grows.

#### Chart Rendering Core

This service uses the Highcharts engine to generate charts based on validated JSON configurations and returns structured outputs (e.g., chart configuration JSON or rendered assets).

### Two-Tier Tool Strategy

Phase 1 tools follow a two-tier approach to balance ease of use with full flexibility:

**Tier 1 — Convenience tools** (`create_chart`)
Simplified, validated input with a curated schema. The tool builds the full Highcharts configuration internally from high-level parameters (chart type, series data, title, categories). Best for common chart patterns where the AI client doesn't need to know Highcharts internals.

**Tier 2 — Raw passthrough tools** (`render_chart`, planned)
Accepts a full Highcharts Options object directly. The server validates the structural shape (e.g., `chart`, `series` keys exist) but delegates real validation to Highcharts at render time. Best for advanced use cases where the AI client needs full control over every Highcharts option.

This two-tier design lets simple requests stay simple while preserving escape hatches for power users and advanced AI workflows.

### Phase 1 Flows

**Tool Discovery**

1. Client connects to MCP server via chosen transport.
2. Server sends supported tool metadata (name, description, schema).
3. Client can list available tools for AI host usage.

**Tool Invocation**

1. Client calls `tools/call` with a chart request payload.
2. Server runs the validation layer on the input.
3. Chart Rendering produces result or errors returned to client.

---

## Phase 2 — Scale & Security

### Objective

Extend the MVP architecture to support production readiness with security, observability, export formatting, and developer tooling.

### Expanded Architecture

```
┌───────────────────────────────────────────────────────┐
|                     Ingress / Load Balancer            |
├───────────────────────────────────────────────────────┤
|                     Auth + Rate Limiting               |
|  (JWT, API Key, OAuth2, RBAC), Quotas                   |
├───────────────────────────────────────────────────────┤
|                     Transport Layer                    |
|     (Streamable HTTP + Optional SSE + Transport adapter)|
├───────────────────────────────────────────────────────┤
|                     MCP Server Core                    |
|  Capability discovery, tool registry                   |
├───────────────────────────────────────────────────────┤
|  Validation Layer             |   Export & Render Layer |
|    Schemas, Validators        |   (PNG, SVG, PDF)      |
├───────────────────────────────────────────────────────┤
|               Observability & Monitoring                |
|  Logs, Metrics, Traces (Prometheus, Grafana)           |
├───────────────────────────────────────────────────────┤
|              CLI + SDK Tooling + Documentation         |
└───────────────────────────────────────────────────────┘
```

### Explanation

#### Authentication & Authorization

Introduce strong security controls:

* **API Keys** or **JWT tokens** for client authentication.
* Optionally OAuth2 for third‑party integrations.
* Rate limiting and quotas to control abuse.
* Role‑based access control for multi‑tenant support.

This ensures that only authorized AI clients and applications can invoke chart tools.

#### Export & Render Layer

Support exporting charts into static formats (PNG, SVG, PDF) so clients can embed charts in reports and dashboards. This layer sits alongside the chart rendering core but focuses on exportable artifacts.

#### Observability

Add monitoring and observability components:

* **Metrics** (latency, tool invocation counts, error rates).
* **Tracing** for performance bottlenecks.
* **Structured Logs** for auditing and security investigations. ([mintmcp.com][3])

By tagging structured logs with request IDs, user identity, and timestamps, your server becomes auditable and traceable.

#### CLI + SDK Tooling

Provide command‑line utilities and language SDKs (JavaScript, Python) to simplify local development, testing, and integration outside AI workflows.

* CLI allows developers to call tools manually.
* SDK wraps MCP calls for application use.

---

## Phase 3 — AI & Productivity

### Objective

Enhance the server with **natural language understanding**, **AI recommendations**, and **higher‑level workflows** such as dashboards and reports.

### Extended Architecture

```
┌───────────────────────────────────────────────────────┐
|      AI Assistance / LLM Integration Services          |
| - Natural language parsing                             |
| - Auto‑correction & suggestion engines                  |
| - Productivity helpers                                 |
├───────────────────────────────────────────────────────┤
|              KPI & Analytics Layer                     |
| - Chart usage patterns                                 |
| - Error trends                                         |
| - Interactive Dashboards                               |
├───────────────────────────────────────────────────────┤
|                Reporting & Scheduling                   |
| - Multi‑chart dashboards                               |
| - Batch report export                                  |
├───────────────────────────────────────────────────────┤
|      Validation | Export | Rendering | Security Layers |
└───────────────────────────────────────────────────────┘
```

### Explanation

#### AI Assistance Services

These services augment your MCP tools with **AI‑assisted capabilities**:

* **Natural Language Parsing**
  Interpret plain English chart requests and convert them to validated configuration objects.

* **AI Suggestion Engine**
  Propose optimal chart types or enhancements based on data context and user queries.

* **Auto‑Correction**
  Analyze validation failures and propose fixes automatically.

This layer may interface with external AI models or utilize client sampling (`sampling/complete`) through MCP when needed. ([modelcontextprotocol.io][2])

#### Reporting & Scheduling

Add workflows for generating **multi‑chart reports**, scheduling exports (e.g., daily dashboards), and delivering them to users or applications.

#### KPI & Analytics

Track usage trends, popular tools, and performance metrics over time. This supports product decisions and optimization efforts.

---

## Component Breakdown & Responsibilities

### Transport Layer

* **Receives MCP connections** (via STDIO or Streamable HTTP).
* **Handles message framing** for JSON‑RPC.

### MCP Server Core

* Manages **capability negotiation**.
* Registers and dispatches tools.
* Coordinates validation and rendering calls.

### Validation Layer

* **Chart schemas** per chart type

  * Separate files for each to avoid monolithic schemas.
* Provides detailed feedback on schema violations.

### Chart Rendering & Export

* Invokes Highcharts for chart generation.
* Supports exporting formats like **PNG/SVG/PDF**.
* May leverage a headless browser or server export service.

### AI & Productivity Layer

* Processes natural language requests.
* Suggests defaults or best practices for chart design.
* Enables auto‑fixes and data‑driven recommendations.

---

## Deployment Considerations

### Containerization

Use Docker for environment consistency across development, staging, and production. Include:

* Application container
* Reverse proxy (NGINX) for SSL termination
* Monitoring agent

### Security

* Enforce HTTPS/TLS.
* Utilize **OAuth2/JWT** for token‑based authorization.
* Scope access to critical endpoints.
* Log access and errors for audit trails.

---

## Summary

Your Highcharts MCP Server architecture evolves through three phases:

1. **Phase 1 — MVP**
   Minimal yet functional MCP server with chart generation, STDIO + Streamable HTTP transport.

2. **Phase 2 — Scale & Security**
   Production readiness with auth, metrics, monitoring, export formats, and tooling.

3. **Phase 3 — AI & Productivity**
   Intelligent services such as natural language processing, suggestions, auto‑correction, dashboards, and analytics.

All phases build on a modular layered architecture where transport, validation, rendering, and services are decoupled to maximize maintainability, extensibility, and testability in production environments.

---