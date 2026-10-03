import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Formats with a client-renderable `image` content block (MCP ImageContent). PDF has none. */
const IMAGE_MIME_TYPES: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
};

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
  const textBlock = {
    type: 'text' as const,
    text: JSON.stringify(
      { config: payload.config, format: payload.format, data: payload.data },
      null,
      2,
    ),
  };

  const mimeType = IMAGE_MIME_TYPES[payload.format];
  if (mimeType === undefined) {
    return { content: [textBlock] };
  }

  // exportService returns SVG as raw XML text and PNG already base64-encoded;
  // ImageContent.data must always be base64.
  const imageData =
    payload.format === 'svg' ? Buffer.from(payload.data, 'utf-8').toString('base64') : payload.data;

  return {
    content: [{ type: 'image', data: imageData, mimeType }, textBlock],
  };
}
