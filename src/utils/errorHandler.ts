import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';
import { errorResult } from './responseFormatter.js';
import { incr } from '../metrics/index.js';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Extracts a diagnostic message that also surfaces a wrapped/inner cause
 * (e.g. highcharts-export-server's `ExportError.setError(innerError)`,
 * which attaches the original error as `.error` without folding it into
 * `.message`). Falls back to `getErrorMessage` when there's no inner cause.
 */
export function getErrorDetails(error: unknown): string {
  const message = getErrorMessage(error);
  const inner = error instanceof Error ? (error as { error?: unknown }).error : undefined;
  if (inner === undefined) return message;
  const innerMessage = inner instanceof Error ? inner.message : String(inner);
  return `${message} (cause: ${innerMessage})`;
}

export async function handleToolError(
  toolName: string,
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    const result = await fn();
    incr('highchart_tool_invocations_total', { tool: toolName, status: 'ok' }, 'Total MCP tool invocations by tool and status.');
    return result;
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error(`Failed to execute ${toolName}`, { error: message });
    incr('highchart_tool_invocations_total', { tool: toolName, status: 'error' }, 'Total MCP tool invocations by tool and status.');
    incr('highchart_errors_total', { tool: toolName }, 'Total MCP tool errors by tool.');
    return errorResult(`Error in ${toolName}: ${message}`);
  }
}
