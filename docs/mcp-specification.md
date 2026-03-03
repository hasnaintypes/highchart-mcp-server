# MCP Specification

This document defines the **Model Context Protocol (MCP)** fundamentals that the **Highcharts MCP Server** implements to enable dynamic interaction with AI clients (e.g., ChatGPT, Claude, Cursor) for chart generation, validation, and export.

The MCP specification is an open, JSON‑RPC‑based protocol designed to enable standardized, bidirectional communication between **clients** and **servers**. It governs messages, transports, capabilities, tools, and lifecycle behavior used throughout your Highcharts MCP Server.

---

## 1. MCP Protocol Overview

Model Context Protocol (MCP) defines a **client–server architecture** where:

* **Hosts** are front‑end AI applications (e.g., chat apps driving LLMs).
* **Clients** are connectors in Hosts that speak MCP.
* **Servers** are services exposing context, tools, resources, and actions.([Model Context Protocol][1])

MCP uses **JSON‑RPC 2.0** as the communication foundation. Every message exchanged between a client and server — whether a request, response, or notification — must follow the JSON‑RPC 2.0 structure.([Model Context Protocol][2])

---

## 2. Messages

### 2.1 JSON‑RPC 2.0 Messages

All MCP messages abide by the JSON‑RPC 2.0 protocol structure. This ensures consistency and interoperability between clients and servers:([Model Context Protocol][2])

#### Requests

Requests initiate an operation:

```json
{
  "jsonrpc": "2.0",
  "id": "unique_id",
  "method": "method/name",
  "params": { ... }
}
```

* **id** must be unique per session.
* **method** identifies the invoked method/tool.

#### Responses

Responses reply to a request:

```json
{
  "jsonrpc": "2.0",
  "id": "same_id",
  "result": { ... }   // successful
  // OR
  "error": {
    "code": number,
    "message": "string",
    "data": {...}
  }
}
```

* Responses MUST include either a **result** or an **error**.
* On errors, `code` and `message` MUST be present.([Model Context Protocol][2])

#### Notifications

Notifications are **fire‑and‑forget** messages with no expected response:

```json
{
  "jsonrpc": "2.0",
  "method": "some/notification",
  "params": { ... }
}
```

* Notifications omit the **id**.([Model Context Protocol][2])

---

## 3. Transports

MCP does not mandate a single transport but defines how clients and servers exchange JSON‑RPC messages over various mediums. Supported transports include:

* **STDIO** – Standard Input/Output streams; useful for local tool integrations and debugging.
* **Streamable HTTP** – HTTP/HTTPS based transport supporting streaming of JSON‑RPC responses.
* **Server‑Sent Events (SSE)** – Optional stream of server‑initiated messages.

Transport selection happens at runtime — your server should support at least Streamable HTTP as a priority, with optional SSE for backwards compatibility. Client libraries should negotiate the supported transport when initializing a session.([Model Context Protocol][1])

---

## 4. Capabilities

MCP uses **capability negotiation** to identify server features during initialization:

* Clients and servers both declare their supported capabilities at session start.
* A server may advertise support for:

  * **tools** — exposing callable tools.
  * **resources** — exposing contextual data.
  * **prompts** — templated text or suggestions.

Example capability declaration on server handshake:

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    }
  }
}
```

* `listChanged` indicates whether the list of tools will emit notifications upon change.([MCP Protocol][3])

---

## 5. Tools

Tools are executable actions that the server exposes to the MCP client. They represent functions such as chart generation, data validation, exporting, or AI enhancement operations.

Each tool in MCP is defined by:

* **name** — Unique string identifier.
* **description** — Human/readable purpose.
* **schema** — JSON Schema describing input arguments and expected types.
* **handler** — Server‑side implementation logic.

Example tool definition there might be in a discovery response:

```json
{
  "name": "create_highchart",
  "description": "Generate a Highcharts chart",
  "input_schema": { ... },
  "output_schema": { ... }
}
```

Servers MUST implement the `tools/list` and `tools/call` JSON‑RPC methods:

* `tools/list` returns the available tools and their schemas.
* `tools/call` invokes a tool with given parameters. Tools MUST validate input based on their declared schema before execution.

Tools SHOULD use JSON Schema 2020‑12 for parameter validation. Servers MUST handle unsupported schema dialects gracefully by reporting a validation error.([Model Context Protocol][4])

---

## 6. Lifecycle

### Initialization

* A client connects over the chosen transport.
* Server and client exchange capability statements.
* Server advertises available tools and supported features.

### Session

* Requests and responses are exchanged using JSON‑RPC.
* Clients invoke tools as needed.

### Termination

* Either side can terminate the connection.
* Servers should attempt graceful shutdown handling in progress.

Mobility of sessions across transports is at implementation discretion — the MCP spec defines stateful connections and expects session integrity.([Model Context Protocol][1])

---

## 7. Authentication & Authorization

The MCP spec provides an authorization framework for HTTP‑based transports:

* HTTP transports SHOULD conform to MCP’s authorization guidelines.
* STDIO transports SHOULD obtain credentials from environment variables instead.
* Many servers also implement additional security layers like API keys or tokens for multi‑tenant usage or access control.

Your Highcharts MCP Server should implement:

* Token‑based authentication (e.g., JWT)
* Optional OAuth2 flow for clients
* Per‑tool authorization rules

These practices ensure secure tool invocation and credential isolation.([Model Context Protocol][2])

---

## 8. Metadata (`_meta` Field)

MCP reserves the `_meta` object to carry additional metadata across requests and responses without interfering with core protocol fields. Metadata key names follow a reverse DNS convention (e.g., `com.yourorg/highcharts/`). Servers and clients MUST NOT make assumptions about the contents of `_meta` and should ignore unknown metadata fields.([Model Context Protocol][5])

---

## 9. Error Handling

When a tool invocation or transport error occurs:

* Return a JSON‑RPC **error response** with:

  * A numeric `code` (negative codes may indicate system errors)
  * A descriptive `message`
  * Optional `data` for structured error information

Example error response:

```json
{
  "jsonrpc": "2.0",
  "id": "req123",
  "error": {
    "code": -32000,
    "message": "Validation failed",
    "data": { ... }
  }
}
```

Servers should log errors locally and optionally emit notifications if supported. Detailed error messages help client libraries provide richer debugging info.([Model Context Protocol][2])

---

## 10. JSON Schema Usage

MCP uses JSON Schema as the primary contract for tool input and output validation:

* Default dialect is JSON Schema 2020‑12.
* Servers MUST support this dialect and document any additional dialects supported.
* Tools MUST declare their parameter schema.

Servers MUST validate against the declared dialect and gracefully return an error if unsupported.([Model Context Protocol][4])

---

## 11. MCP Extensions & Utilities

MCP defines other utility layers, such as:

* **Cancellation support** — tool invocation can be cancelled.
* **Progress tracking** — support for streaming progress notifications.
* **Logging hooks** — structured logs useful for monitoring.

These features are optional but recommended for production servers. They should follow extension conventions in the official spec and default JSON‑RPC patterns.([Model Context Protocol][1])

---

## Appendix A — MCP Methods Summary

| Method                    | Category        | Purpose                           |
| ------------------------- | --------------- | --------------------------------- |
| `tools/list`              | Tool Discovery  | Returns tool metadata and schemas |
| `tools/call`              | Tool Invocation | Executes a named tool             |
| JSON‑RPC standard methods | Protocol        | Request/response workflow         |
| Notifications             | Protocol        | One‑way signaling                 |

---

## Appendix B — JSON‑RPC Message Template

**Request**

```json
{
  "jsonrpc": "2.0",
  "id": "unique",
  "method": "tools/call",
  "params": { “name”: “create_highchart”, “arguments”: {...} }
}
```

**Response**

Successful:

```json
{
  "jsonrpc": "2.0",
  "id": "unique",
  "result": { "status": "ok", "content": {...} }
}
```

Error:

```json
{
  "jsonrpc": "2.0",
  "id": "unique",
  "error": { "code": -32001, "message": "Error description" }
}
```

---

## References

* MCP specification, JSON‑RPC base protocol (2025 Revision) ([Model Context Protocol][2])
* MCP architecture and capability negotiation ([Model Context Protocol][1])
* MCP tools section for tool declaration and interaction ([Model Context Protocol][6])
