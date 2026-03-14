import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function successResult(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function chartRenderResult(payload: {
  config: unknown;
  format: string;
  data: string;
}): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          { config: payload.config, format: payload.format, data: payload.data },
          null,
          2,
        ),
      },
    ],
  };
}
