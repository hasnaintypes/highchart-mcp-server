import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';
import { errorResult } from './responseFormatter.js';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function handleToolError(
  toolName: string,
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    const message = getErrorMessage(error);
    logger.error(`Failed to execute ${toolName}`, { error: message });
    return errorResult(`Error in ${toolName}: ${message}`);
  }
}
