import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';
import { errorResult } from './responseFormatter.js';
import { incr } from '../metrics/index.js';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
