import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod/v4';
import { HighchartClient, HighchartToolError } from '../src/index.js';

// A stub MCP server mirroring the real tool response shapes, so the SDK's
// transport + parsing is tested without the export service / Chromium.
function buildStubServer(): McpServer {
  const server = new McpServer({ name: 'stub', version: '1.0.0' });

  server.registerTool(
    'create_chart',
    { description: 'stub', inputSchema: z.object({ type: z.string() }).passthrough().shape },
    async (args) => {
      if (args.type === 'bad') {
        return { isError: true, content: [{ type: 'text', text: 'Unsupported chart type' }] };
      }
      const body = { constr: 'chart', options: { chart: { type: args.type }, series: args.series ?? [] } };
      return { content: [{ type: 'text', text: JSON.stringify(body) }] };
    },
  );

  server.registerTool(
    'render_chart',
    { description: 'stub', inputSchema: z.object({ chartOptions: z.record(z.string(), z.unknown()) }).passthrough().shape },
    async (args) => {
      const body = { config: args.chartOptions, format: args.format ?? 'svg', data: '<svg>ok</svg>' };
      return { content: [{ type: 'text', text: JSON.stringify(body) }] };
    },
  );

  server.registerTool(
    'export_chart',
    { description: 'stub', inputSchema: z.object({ chartOptions: z.record(z.string(), z.unknown()), format: z.string() }).passthrough().shape },
    async (args) => {
      const body = { config: args.chartOptions, format: args.format, data: 'base64==' };
      return { content: [{ type: 'text', text: JSON.stringify(body) }] };
    },
  );

  server.registerTool(
    'list_chart_types',
    { description: 'stub', inputSchema: z.object({ family: z.string().optional() }).shape },
    async () => {
      const body = {
        totalTypes: 70,
        totalFamilies: 1,
        families: [{ family: 'cartesian', constr: 'chart', types: ['line'], needsColorAxis: false, description: 'd', dataShapeHint: 'h', example: {} }],
      };
      return { content: [{ type: 'text', text: JSON.stringify(body) }] };
    },
  );

  return server;
}

describe('HighchartClient (SDK)', () => {
  let client: HighchartClient;
  let server: McpServer;

  beforeAll(async () => {
    server = buildStubServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = await HighchartClient.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('createChart returns { constr, options }', async () => {
    const result = (await client.createChart({ type: 'line', series: [{ data: [1, 2, 3] }] })) as {
      constr: string;
      options: { chart: { type: string } };
    };
    expect(result.constr).toBe('chart');
    expect(result.options.chart.type).toBe('line');
  });

  it('createChart throws HighchartToolError on error result', async () => {
    await expect(client.createChart({ type: 'bad' })).rejects.toBeInstanceOf(HighchartToolError);
  });

  it('renderChart forwards format/constr and returns RenderResult', async () => {
    const result = await client.renderChart(
      { chart: { type: 'candlestick' }, series: [{ data: [] }] },
      { format: 'svg', constr: 'stockChart' },
    );
    expect(result.format).toBe('svg');
    expect(result.data).toContain('<svg>');
  });

  it('exportChart returns the requested format', async () => {
    const result = await client.exportChart(
      { chart: { type: 'bar' }, series: [{ data: [1] }] },
      { format: 'png', width: 800 },
    );
    expect(result.format).toBe('png');
    expect(result.data).toBe('base64==');
  });

  it('listChartTypes returns the catalog', async () => {
    const result = await client.listChartTypes();
    expect(result.totalTypes).toBe(70);
    expect(result.families[0]!.family).toBe('cartesian');
  });
});
