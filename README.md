# Highcharts MCP Server

A **Model Context Protocol (MCP) server** designed to generate Highcharts‑based charts and visualizations in a **production‑ready**, **AI‑enhanced**, and **validated** manner. This server can be integrated with any MCP‑capable AI client (such as Claude, ChatGPT, Cursor, Dify, VSCode, etc.) to automate chart generation, validation, and export workflows.

## Overview

The Highcharts MCP Server provides:

* Chart generation for **all common Highcharts types**
* **Schema validation** of chart configurations
* **Production grade features** for scalability, security, and monitoring
* **AI‑assisted functionality**, such as natural language chart generation
* CLI and SDK tooling for developers

It acts as an MCP tool suite exposing Highcharts chart generation endpoints that can be invoked by AI assistants or custom clients.

## Table of Contents

1. Features
2. Architecture
3. Installation
4. Usage
5. Validation System
6. Production Readiness
7. AI & LLM Integration
8. Tooling & Developer Experience
9. Analytics & Monitoring
10. Contributing
11. License

---

## 1. Features

### Core Chart Capabilities

The MCP server supports generating charts using Highcharts configurations:

* Line, Column, Bar
* Area, Scatter, Pie
* Gauge, Treemap, Heatmap
* Financial charts (OHLC, Candlestick)
* Specialized chart types (Sankey, Network, Timeline)
* Export to **PNG, SVG, PDF**, and interactive HTML bundles
  (Concepts based on MCP chart servers and Highcharts Node export support)([highcharts.com][2])

### Schema Validation

All incoming chart configuration requests are validated against **JSON schema or Zod schemas**:

* Type enforcement for chart options
* Validation of data arrays, axis definitions, series structure
* Detailed and structured error responses on invalid configs
  (Validation approach inspired by existing MCP chart servers)([GitHub][3])

### Production‑Grade Reliability

* **Scalable deployment** via Docker, Kubernetes
* Multi‑transport support: HTTP(S), SSE, Streamable HTTP, STDIO
* Health check endpoints
* High availability and load balancing
* Configurable caching and rate limits

### Security & Access Control

* API key, OAuth2, and JWT authentication
* RBAC (Role‑based access control)
* Rate limiting and quotas
* Audit logging for compliance

### AI & LLM Enhancements

* **Natural language to chart config translation**
* Chart type suggestions based on dataset or analytics question
* Auto‑correction of invalid configs using AI
* Integration hooks for LLM workflows

### Export & Output

* Static and interactive chart outputs
* Batch and scheduled export capabilities
* Link generation for shareable chart assets

### Monitoring & Observability

* Prometheus / Grafana integration
* Structured logging
* Performance metrics
* Error reporting dashboards

### Tooling & SDKs

* CLI tooling for quick local operations
* JavaScript and Python SDKs
* Interactive schema documentation
* Playground UI for testing configurations

---

## 2. Architecture

The server consists of:

* **Transport layer** — Handles different MCP transports (HTTP/SSE, streamable, STDIO)
* **Schema validation layer** — Ensures chart configs are correct
* **Chart renderer** — Uses Highcharts engine (Node export or server rendering)
* **AI processing layer** — Optional natural language preprocessing
* **Output services** — Export and sharing

The server uses a modular structure to isolate responsibilities and enable plug‑ins/extensions.

---

## 3. Installation

### Prerequisites

* Node.js 18+
* Docker (optional)
* Kubernetes (optional)

### Local Setup

Clone the repository:

```bash
git clone https://your-repo-url
cd highcharts-mcp-server
npm install
npm run build
npm start
```

### Docker

Build the Docker image:

```bash
docker build -t highcharts-mcp-server .
docker run -p 8080:8080 highcharts-mcp-server
```

---

## 4. Usage

### Basic Chart Call

Chart generation is done by invoking MCP tools with chart config objects. For example:

```json
{
  "tool": "create_chart",
  "input": {
    "type": "line",
    "data": {
      "categories": ["Jan", "Feb", "Mar"],
      "series": [
        {"name": "Sales", "data": [10, 15, 20]}
      ]
    },
    "options": {}
  }
}
```

The MCP server validates the input and returns chart data or export artifacts.

---

## 5. Validation System

The server uses a **schema validation system**:

* Zod or JSON Schema definitions for each chart type
* Shared utility schemas for common entities (axis, series, color)
* Error objects with detailed messages

Invalid requests return structured responses indicating the validation failures.

---

## 6. Production Readiness

### Deployment

Supports deployment in production environments:

* Containerized deployment with Docker
* Kubernetes configuration with health probes
* Environment variable configuration

### Security

* Configurable auth providers
* TLS/HTTPS enforcement
* Audit logs

### Scalability

* Stateless MCP server instances
* Horizontal autoscaling
* Caching for repeated chart requests

---

## 7. AI & LLM Integration

The server provides AI‑centric features:

* **Natural language parser** — Converts descriptions to chart configs
* **Suggestions API** — Suggests chart types and options
* **Error correction API** — Uses AI to fix configs

These integrations make the server suitable for interactive AI applications and assistants.

---

## 8. Tooling & Developer Experience

### CLI

Provides commands for:

* Validating chart configs
* Exporting charts locally
* Testing chart output

### SDKs

* JavaScript SDK for client integrations
* Python SDK for backend integrations

### Playground

An interactive UI to test chart configs and see live output.

---

## 9. Analytics & Monitoring

* Prometheus metrics exposed
* Logs with structured levels
* Dashboard templates for Grafana

These help monitor server performance and usage patterns.

---

## 10. Contributing

To contribute:

1. Fork the repository
2. Create a feature branch
3. Add tests and documentation
4. Submit a pull request

Please follow code style guidelines and include tests for new features.

---

## 11. License

Released under the **MIT License**.

