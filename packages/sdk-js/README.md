# @highchart-mcp/sdk

Typed TypeScript client for the [Highcharts MCP server](../../README.md).

## Install

```bash
npm install @highchart-mcp/sdk
```

## Usage

```ts
import { HighchartClient } from '@highchart-mcp/sdk';

// Connect to a running HTTP server (with optional API key)...
const client = await HighchartClient.connectHttp('http://localhost:3000/mcp', {
  apiKey: process.env.HIGHCHART_API_KEY,
});

// ...or spawn the server over stdio:
// const client = await HighchartClient.connectStdio({ command: 'node', args: ['dist/index.js'] });

// Build a config for any of the 70 chart types:
const { constr, options } = await client.createChart({
  type: 'line',
  title: 'Sales',
  xAxisCategories: ['Jan', 'Feb', 'Mar'],
  series: [{ name: 'Revenue', data: [10, 20, 15] }],
});

// Render a full Highcharts options object:
const svg = await client.renderChart(
  { chart: { type: 'candlestick' }, series: [{ data: [[1, 2, 3, 1, 2]] }] },
  { format: 'svg', constr: 'stockChart' },
);

// Discover types + data shapes:
const catalog = await client.listChartTypes();

await client.close();
```

## API

- `HighchartClient.connect(transport)` — any MCP client transport (e.g. in-memory).
- `HighchartClient.connectHttp(url, { apiKey?, headers? })`
- `HighchartClient.connectStdio({ command, args?, env? })`
- `createChart(input)` → `{ constr, options }` (or a render result if `input.format` is set)
- `renderChart(chartOptions, { format?, constr? })` → `{ config, format, data }`
- `exportChart(chartOptions, { format, constr?, width?, height?, scale? })`
- `listChartTypes(family?)`
- `close()`

Tool errors throw `HighchartToolError`.
