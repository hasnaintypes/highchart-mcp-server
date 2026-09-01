// Dev-only static mirror of the locally-installed `highcharts` package.
//
// The highcharts-export-server fetches Highcharts scripts from a CDN on first
// init (e.g. https://code.highcharts.com/highcharts.js, /modules/<name>.js).
// This tiny server mirrors that layout from node_modules/highcharts so the
// cache can be seeded offline. It is NOT part of the runtime server.
//
// Usage: `startMirror()` returns { url, close }. See scripts/seed-cache.mjs.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HC_ROOT = join(__dirname, '..', 'node_modules', 'highcharts');

// highcharts-export-server requests scripts using the *CDN's* URL layout,
// which doesn't exactly match the npm package's on-disk layout:
//   - the CDN nests map modules under `maps/modules/<name>.js`; the npm
//     package ships them flat, at `modules/<name>.js`.
//   - the CDN nests stock indicators under `stock/indicators/<name>.js`;
//     the npm package ships them flat, at `indicators/<name>.js`.
// Remap those prefixes so the mirror can find the real file.
const PATH_REMAPS = [
  [/^maps\/modules\//, 'modules/'],
  [/^stock\/indicators\//, 'indicators/'],
];

// Scripts the export server's default module list still requests for CDN
// backward-compatibility, but whose functionality has since been merged into
// Highcharts core (so the npm package no longer ships a standalone file).
// The real CDN keeps serving an effectively-empty stub for these; mirror that
// so the fetched-module count matches what the export server expects.
const MERGED_INTO_CORE = new Set(['modules/overlapping-datalabels.js']);

/**
 * Starts the mirror on an ephemeral port.
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export function startMirror() {
  const server = createServer(async (req, res) => {
    try {
      // Strip query/leading slash; block path traversal. Work in forward-slash
      // form (matching the CDN-style request paths) until the very end, since
      // `normalize()` rewrites separators to the OS-native form on Windows.
      const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '');
      let safePath = rawPath.replace(/^(\.\.\/)+/, '');
      for (const [pattern, replacement] of PATH_REMAPS) {
        safePath = safePath.replace(pattern, replacement);
      }

      if (MERGED_INTO_CORE.has(safePath)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('// Merged into Highcharts core; kept as an empty stub for compatibility.\n');
        return;
      }

      const filePath = join(HC_ROOT, normalize(safePath));

      if (!filePath.startsWith(HC_ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(body);
    } catch {
      // Non-required scripts may be genuinely absent in this Highcharts
      // version — 404 is fine (the export server logs and continues).
      res.writeHead(404).end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
