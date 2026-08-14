/** Thrown when an MCP tool call returns an error result. */
export class HighchartToolError extends Error {
  readonly tool: string;

  constructor(tool: string, message: string) {
    super(message);
    this.name = 'HighchartToolError';
    this.tool = tool;
  }
}
