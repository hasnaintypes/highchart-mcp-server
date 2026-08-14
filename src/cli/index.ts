#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { config } from '../config/index.js';
import { getErrorMessage } from '../utils/index.js';
import type { ExportFormat } from '../services/index.js';
import type { HcConstructor } from '../charts/index.js';
import {
  createCommand,
  renderCommand,
  exportCommand,
  listTypesCommand,
  serveCommand,
} from './commands.js';

const HELP = `highchart-mcp — Highcharts MCP server CLI

Usage:
  highchart-mcp <command> [options]

Commands:
  create       Build a Highcharts config for a type (optionally render it)
  render       Render a full Highcharts options object (default svg)
  export       Export a chart to svg/png/pdf with size overrides
  list-types   List all supported chart types (grouped by family)
  serve        Start the MCP server (stdio or http)

Options:
  --type <t>            Chart type (create)
  --input <file|->      JSON input file, or - for stdin
  --title <text>        Chart title (create)
  --format <svg|png|pdf>
  --constr <chart|stockChart|mapChart|ganttChart>
  --width <n> --height <n> --scale <n>   (export)
  --out <file>          Write output to a file (else stdout)
  --family <id>         Filter list-types by family
  --json                Machine-readable output (list-types)
  --transport <stdio|http> --port <n>    (serve)
  -h, --help            Show help
  -v, --version         Show version

Examples:
  highchart-mcp list-types
  highchart-mcp create --type line --input chart.json --format svg --out chart.svg
  echo '{"chart":{"type":"bar"},"series":[{"data":[1,2,3]}]}' | highchart-mcp render -
`;

function asFormat(value: string | undefined): ExportFormat | undefined {
  if (value === 'svg' || value === 'png' || value === 'pdf') return value;
  if (value !== undefined) throw new Error(`Invalid --format "${value}" (expected svg|png|pdf)`);
  return undefined;
}

function asConstr(value: string | undefined): HcConstructor | undefined {
  if (value === 'chart' || value === 'stockChart' || value === 'mapChart' || value === 'ganttChart') {
    return value;
  }
  if (value !== undefined) throw new Error(`Invalid --constr "${value}"`);
  return undefined;
}

function asNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid --${name} "${value}" (expected a number)`);
  return n;
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      type: { type: 'string' },
      input: { type: 'string' },
      title: { type: 'string' },
      format: { type: 'string' },
      constr: { type: 'string' },
      out: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      scale: { type: 'string' },
      family: { type: 'string' },
      json: { type: 'boolean' },
      transport: { type: 'string' },
      port: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version === true) {
    process.stdout.write(`${config.SERVER_VERSION}\n`);
    return;
  }

  const command = positionals[0];
  if (values.help === true || command === undefined || command === 'help') {
    process.stdout.write(HELP);
    return;
  }

  switch (command) {
    case 'create':
      await createCommand({
        type: values.type,
        input: values.input,
        title: values.title,
        format: asFormat(values.format),
        constr: asConstr(values.constr),
        out: values.out,
      });
      break;
    case 'render':
      await renderCommand({
        input: values.input ?? positionals[1],
        format: asFormat(values.format),
        constr: asConstr(values.constr),
        out: values.out,
      });
      break;
    case 'export': {
      const format = asFormat(values.format);
      if (format === undefined) throw new Error('export requires --format <svg|png|pdf>');
      await exportCommand({
        input: values.input ?? positionals[1],
        format,
        constr: asConstr(values.constr),
        width: asNumber(values.width, 'width'),
        height: asNumber(values.height, 'height'),
        scale: asNumber(values.scale, 'scale'),
        out: values.out,
      });
      break;
    }
    case 'list-types':
      listTypesCommand({ family: values.family, json: values.json });
      break;
    case 'serve':
      await serveCommand({ transport: values.transport, port: asNumber(values.port, 'port') });
      break;
    default:
      throw new Error(`Unknown command "${command}". Run with --help.`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Error: ${getErrorMessage(error)}\n`);
  process.exit(1);
});
