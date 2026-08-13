// Dev-only: render one sample per constructor (and a few advanced types) to
// .render-samples/ for visual confirmation. Requires a seeded cache
// (`npm run seed:cache`) or network access.
//
// Run: `npm run render:samples`

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outDir = join(repoRoot, '.render-samples');

// Cache is resolved relative to the export server package dir; ../../.hc-cache
// lands at the repo root (matching seed-cache.mjs).
if (process.env.HIGHCHARTS_CACHE_PATH === undefined) {
  process.env.HIGHCHARTS_CACHE_PATH = '../../.hc-cache';
}

const { initExportService, shutdownExportService, exportChart } = await import(
  pathToFileURL(join(repoRoot, 'dist', 'services', 'exportService.js')).href
);
const { buildFromInput } = await import(
  pathToFileURL(join(repoRoot, 'dist', 'charts', 'index.js')).href
);

const inlineTopology = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'A' },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]] },
    },
  ],
};

const samples = [
  { file: 'line', input: { type: 'line', title: 'Line', series: [{ data: [1, 3, 2, 4] }] } },
  { file: 'heatmap', input: { type: 'heatmap', title: 'Heatmap', series: [{ data: [[0, 0, 5], [1, 1, 8]] }] } },
  { file: 'sankey', input: { type: 'sankey', title: 'Sankey', series: [{ data: [{ from: 'A', to: 'B', weight: 3 }] }] } },
  { file: 'treemap', input: { type: 'treemap', title: 'Treemap', series: [{ data: [{ id: 'r', name: 'r' }, { parent: 'r', name: 'a', value: 5 }] }] } },
  { file: 'gauge', input: { type: 'gauge', title: 'Gauge', series: [{ data: [70] }] } },
  { file: 'candlestick', input: { type: 'candlestick', title: 'Candlestick', series: [{ data: [[1609459200000, 1, 3, 0.5, 2]] }] } },
  { file: 'map', input: { type: 'map', title: 'Map', topology: inlineTopology, data: [{ value: 1 }] } },
  { file: 'gantt', input: { type: 'gantt', title: 'Gantt', tasks: [{ name: 'Design', start: '2024-01-01', end: '2024-01-05' }] } },
];

await mkdir(outDir, { recursive: true });
await initExportService();

let ok = 0;
for (const { file, input } of samples) {
  try {
    const { options, constr } = buildFromInput(input);
    const out = await exportChart(options, 'svg', { constr });
    await writeFile(join(outDir, `${file}.svg`), out.data, 'utf8');
    const good = typeof out.data === 'string' && out.data.includes('<svg');
    if (good) ok += 1;
    console.log(`${good ? 'OK ' : 'BAD'} ${file.padEnd(12)} constr=${constr} bytes=${out.data?.length ?? 0}`);
  } catch (error) {
    console.log(`ERR ${file.padEnd(12)} ${error?.message ?? error}`);
  }
}

await shutdownExportService().catch(() => {});
console.log(`\n${ok}/${samples.length} rendered → ${outDir}`);
process.exitCode = ok === samples.length ? 0 : 1;
