import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { HighchartToolError } from './errors.js';
import type {
  ChartOptions,
  CreateChartInput,
  CreateChartResult,
  ExportOptions,
  ListChartTypesResult,
  RenderOptions,
  RenderResult,
} from './types.js';

/** The transport type accepted by the MCP client's `connect`. */
type ClientTransport = Parameters<Client['connect']>[0];

export interface ConnectHttpOptions {
  /** Sent as `Authorization: Bearer <apiKey>`. */
  apiKey?: string;
  /** Extra request headers (merged; e.g. `x-api-key`). */
  headers?: Record<string, string>;
}

export interface ConnectStdioOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface ToolContentText {
  type: string;
  text?: string;
}

/** Ergonomic, typed client for the Highcharts MCP server. */
export class HighchartClient {
  private readonly client: Client;

  private constructor(client: Client) {
    this.client = client;
  }

  /** Connect using any MCP client transport (e.g. InMemoryTransport for tests). */
  static async connect(transport: ClientTransport): Promise<HighchartClient> {
    const client = new Client({ name: '@highchart-mcp/sdk', version: '0.1.0' });
    await client.connect(transport);
    return new HighchartClient(client);
  }

  /** Spawn the server over stdio and connect. */
  static connectStdio(options: ConnectStdioOptions): Promise<HighchartClient> {
    const transport = new StdioClientTransport({
      command: options.command,
      args: options.args ?? [],
      ...(options.env !== undefined ? { env: options.env } : {}),
    });
    return HighchartClient.connect(transport);
  }

  /** Connect to a running server over Streamable HTTP. */
  static connectHttp(url: string, options: ConnectHttpOptions = {}): Promise<HighchartClient> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.apiKey !== undefined) headers['Authorization'] = `Bearer ${options.apiKey}`;
    const transport = new StreamableHTTPClientTransport(
      new URL(url),
      Object.keys(headers).length > 0 ? { requestInit: { headers } } : undefined,
    );
    return HighchartClient.connect(transport);
  }

  private async call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
    const result = await this.client.callTool({ name: tool, arguments: args });
    const content = (result.content ?? []) as ToolContentText[];
    const text = content.find((c) => c.type === 'text')?.text ?? '';
    if (result.isError === true) {
      throw new HighchartToolError(tool, text);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  /**
   * Build a Highcharts config for a chart type. Returns `{ constr, options }`,
   * or a `RenderResult` when `input.format` is set.
   */
  createChart(input: CreateChartInput): Promise<CreateChartResult | RenderResult> {
    return this.call<CreateChartResult | RenderResult>('create_chart', input);
  }

  /** Render a full Highcharts options object (default format: svg). */
  renderChart(chartOptions: ChartOptions, options: RenderOptions = {}): Promise<RenderResult> {
    const args: Record<string, unknown> = { chartOptions };
    if (options.format !== undefined) args['format'] = options.format;
    if (options.constr !== undefined) args['constr'] = options.constr;
    return this.call<RenderResult>('render_chart', args);
  }

  /** Export a chart with an explicit format and optional size/constructor. */
  exportChart(chartOptions: ChartOptions, options: ExportOptions): Promise<RenderResult> {
    const args: Record<string, unknown> = { chartOptions, format: options.format };
    if (options.constr !== undefined) args['constr'] = options.constr;
    if (options.width !== undefined) args['width'] = options.width;
    if (options.height !== undefined) args['height'] = options.height;
    if (options.scale !== undefined) args['scale'] = options.scale;
    return this.call<RenderResult>('export_chart', args);
  }

  /** List every supported chart type grouped by family (optionally filtered). */
  listChartTypes(family?: string): Promise<ListChartTypesResult> {
    const args: Record<string, unknown> = {};
    if (family !== undefined) args['family'] = family;
    return this.call<ListChartTypesResult>('list_chart_types', args);
  }

  /** Close the underlying MCP connection. */
  async close(): Promise<void> {
    await this.client.close();
  }
}
