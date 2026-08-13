import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Mock the export service so tests run without Puppeteer
vi.mock('../../src/services/exportService.js', () => ({
  initExportService: vi.fn(async () => {}),
  shutdownExportService: vi.fn(),
  exportChart: vi.fn(
    async (
      chartOptions: Record<string, unknown>,
      format: string,
      _overrides?: Record<string, unknown>,
    ) => ({
      format,
      data:
        format === 'svg'
          ? '<svg>mock</svg>'
          : 'bW9ja2Jhc2U2NA==',
    }),
  ),
}));

// Import after mock so tools pick up the mocked exportChart
const { registerAllTools } = await import('../../src/tools/index.js');
const { exportChart } = await import('../../src/services/exportService.js');

describe('MCP Server Integration', () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerAllTools(server);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: 'test-client', version: '1.0.0' });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe('Tool discovery', () => {
    it('should list create_chart tool', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('create_chart');
    });

    it('should have correct input schema for create_chart', async () => {
      const result = await client.listTools();
      const createChart = result.tools.find((t) => t.name === 'create_chart');
      expect(createChart).toBeDefined();
      expect(createChart!.inputSchema).toBeDefined();
    });

    it('should list render_chart tool', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('render_chart');
    });

    it('should have correct input schema for render_chart', async () => {
      const result = await client.listTools();
      const renderChart = result.tools.find((t) => t.name === 'render_chart');
      expect(renderChart).toBeDefined();
      expect(renderChart!.inputSchema).toBeDefined();
    });

    it('should list export_chart tool', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('export_chart');
    });

    it('should list list_chart_types tool', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_chart_types');
    });

    it('should list all 4 tools', async () => {
      const result = await client.listTools();
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toEqual(
        expect.arrayContaining([
          'create_chart',
          'render_chart',
          'export_chart',
          'list_chart_types',
        ]),
      );
      expect(result.tools).toHaveLength(4);
    });
  });

  describe('list_chart_types tool', () => {
    it('should return the full catalog with a total type count', async () => {
      const result = await client.callTool({
        name: 'list_chart_types',
        arguments: {},
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.totalTypes).toBe(70);
      expect(Array.isArray(parsed.families)).toBe(true);
      expect(parsed.families.length).toBe(parsed.totalFamilies);
    });

    it('should filter by family', async () => {
      const result = await client.callTool({
        name: 'list_chart_types',
        arguments: { family: 'financial' },
      });

      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.families).toHaveLength(1);
      expect(parsed.families[0].family).toBe('financial');
      expect(parsed.families[0].constr).toBe('stockChart');
      expect(parsed.families[0].types).toContain('candlestick');
    });
  });

  describe('create_chart tool', () => {
    it('should create a line chart with valid input', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'line',
          title: 'Sales Over Time',
          xAxisCategories: ['Jan', 'Feb', 'Mar'],
          series: [{ name: 'Revenue', data: [100, 200, 300] }],
        },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content).toHaveLength(1);
      expect(content[0]!.type).toBe('text');

      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.constr).toBe('chart');
      const config = parsed.options;
      expect(config.chart.type).toBe('line');
      expect(config.title.text).toBe('Sales Over Time');
      expect(config.xAxis.categories).toEqual(['Jan', 'Feb', 'Mar']);
      expect(config.series).toHaveLength(1);
      expect(config.series[0].name).toBe('Revenue');
      expect(config.series[0].data).toEqual([100, 200, 300]);
    });

    it('should create a pie chart without xAxis', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'pie',
          title: 'Market Share',
          series: [{ name: 'Share', data: [40, 30, 20, 10] }],
        },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const config = JSON.parse(content[0]!.text).options;
      expect(config.chart.type).toBe('pie');
      expect(config.xAxis).toBeUndefined();
    });

    it('should use empty string as default title when omitted', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'bar',
          series: [{ data: [1, 2, 3] }],
        },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const config = JSON.parse(content[0]!.text).options;
      expect(config.title.text).toBe('');
    });

    it('should reject invalid chart type', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'invalidtype',
          series: [{ data: [1, 2, 3] }],
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject empty series array', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'line',
          series: [],
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('render_chart tool', () => {
    it('should return config, format, and data shape', async () => {
      const chartOptions = {
        chart: { type: 'line' },
        series: [{ name: 'Sales', data: [100, 200, 300] }],
      };

      const result = await client.callTool({
        name: 'render_chart',
        arguments: { chartOptions },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content).toHaveLength(1);

      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.config).toEqual(chartOptions);
      expect(parsed.format).toBe('svg');
      expect(parsed.data).toBe('<svg>mock</svg>');
    });

    it('should accept explicit png format', async () => {
      const chartOptions = {
        chart: { type: 'bar' },
        series: [{ data: [1, 2, 3] }],
      };

      const result = await client.callTool({
        name: 'render_chart',
        arguments: { chartOptions, format: 'png' },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.format).toBe('png');
      expect(parsed.data).toBe('bW9ja2Jhc2U2NA==');
    });

    it('should pass through extra Highcharts options in config', async () => {
      const chartOptions = {
        chart: { type: 'line', zoomType: 'x' },
        title: { text: 'Revenue Trend' },
        tooltip: { shared: true, crosshairs: true },
        legend: { enabled: true, layout: 'vertical' },
        plotOptions: { line: { marker: { enabled: false } } },
        xAxis: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] },
        series: [
          { name: 'Revenue', data: [100, 200, 150, 300], type: 'line' },
        ],
      };

      const result = await client.callTool({
        name: 'render_chart',
        arguments: { chartOptions },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.config).toEqual(chartOptions);
    });

    it('should reject missing chart key', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            series: [{ data: [1, 2, 3] }],
          },
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject missing series key', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
          },
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject empty series array', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
            series: [],
          },
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject missing chart.type', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            chart: {},
            series: [{ data: [1, 2, 3] }],
          },
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('export_chart tool', () => {
    it('should export a chart as svg', async () => {
      const chartOptions = {
        chart: { type: 'line' },
        series: [{ data: [1, 2, 3] }],
      };

      const result = await client.callTool({
        name: 'export_chart',
        arguments: { chartOptions, format: 'svg' },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.config).toEqual(chartOptions);
      expect(parsed.format).toBe('svg');
      expect(parsed.data).toBe('<svg>mock</svg>');
    });

    it('should export a chart as png', async () => {
      const chartOptions = {
        chart: { type: 'bar' },
        series: [{ name: 'Test', data: [10, 20] }],
      };

      const result = await client.callTool({
        name: 'export_chart',
        arguments: { chartOptions, format: 'png' },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const parsed = JSON.parse(content[0]!.text);
      expect(parsed.format).toBe('png');
      expect(parsed.data).toBe('bW9ja2Jhc2U2NA==');
    });

    it('should pass dimension overrides to exportChart', async () => {
      const chartOptions = {
        chart: { type: 'column' },
        series: [{ data: [5, 10] }],
      };

      const result = await client.callTool({
        name: 'export_chart',
        arguments: {
          chartOptions,
          format: 'png',
          width: 1024,
          height: 768,
          scale: 2,
        },
      });

      expect(result.isError).toBeFalsy();

      // Verify the mock was called with overrides
      expect(exportChart).toHaveBeenCalledWith(
        chartOptions,
        'png',
        { width: 1024, height: 768, scale: 2 },
      );
    });

    it('should reject missing format', async () => {
      const result = await client.callTool({
        name: 'export_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
            series: [{ data: [1] }],
          },
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject invalid format', async () => {
      const result = await client.callTool({
        name: 'export_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
            series: [{ data: [1] }],
          },
          format: 'gif',
        },
      });

      expect(result.isError).toBe(true);
    });

    it('should reject empty series', async () => {
      const result = await client.callTool({
        name: 'export_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
            series: [],
          },
          format: 'svg',
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Error message quality', () => {
    it('should mention valid types when create_chart type is invalid', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'invalidtype',
          series: [{ data: [1, 2, 3] }],
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).toContain('line');
      expect(text).toContain('bar');
      expect(text).toContain('pie');
    });

    it('should mention "at least one" when create_chart series is empty', async () => {
      const result = await client.callTool({
        name: 'create_chart',
        arguments: {
          type: 'line',
          series: [],
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).toContain('at least one');
    });

    it('should mention "type" when render_chart chart.type is missing', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            chart: {},
            series: [{ data: [1, 2, 3] }],
          },
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).toContain('type');
    });

    it('should mention "at least one" when render_chart series is empty', async () => {
      const result = await client.callTool({
        name: 'render_chart',
        arguments: {
          chartOptions: {
            chart: { type: 'line' },
            series: [],
          },
        },
      });

      expect(result.isError).toBe(true);
      const text = (result.content as Array<{ text: string }>)[0]!.text;
      expect(text).toContain('at least one');
    });
  });
});
