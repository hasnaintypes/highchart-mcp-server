import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerAllTools } from '../../src/tools/index.js';

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

      const config = JSON.parse(content[0]!.text);
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
      const config = JSON.parse(content[0]!.text);
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
      const config = JSON.parse(content[0]!.text);
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
    it('should pass through a full Highcharts config with extras', async () => {
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
      expect(content).toHaveLength(1);
      expect(content[0]!.type).toBe('text');

      const config = JSON.parse(content[0]!.text);
      expect(config).toEqual(chartOptions);
    });

    it('should pass through a minimal valid config', async () => {
      const chartOptions = {
        chart: { type: 'bar' },
        series: [{ data: [1, 2, 3] }],
      };

      const result = await client.callTool({
        name: 'render_chart',
        arguments: { chartOptions },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const config = JSON.parse(content[0]!.text);
      expect(config).toEqual(chartOptions);
    });

    it('should pass through config with multiple series of different structures', async () => {
      const chartOptions = {
        chart: { type: 'column' },
        series: [
          { name: 'Sales', data: [10, 20, 30], color: '#ff0000' },
          { name: 'Profit', data: [5, 15, 25], dashStyle: 'ShortDash' },
          { type: 'line', data: [7, 17, 27], marker: { symbol: 'circle' } },
        ],
      };

      const result = await client.callTool({
        name: 'render_chart',
        arguments: { chartOptions },
      });

      expect(result.isError).toBeFalsy();
      const content = result.content as Array<{ type: string; text: string }>;
      const config = JSON.parse(content[0]!.text);
      expect(config).toEqual(chartOptions);
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
});
