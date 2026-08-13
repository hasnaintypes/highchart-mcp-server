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

/**
 * Starts the mirror on an ephemeral port.
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export function startMirror() {
  const server = createServer(async (req, res) => {
    try {
      // Strip query/leading slash; block path traversal.
      const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '');
      const safePath = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
      const filePath = join(HC_ROOT, safePath);

      if (!filePath.startsWith(HC_ROOT)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(body);
    } catch {
      // Non-required scripts (e.g. overlapping-datalabels) may be absent — 404 is fine.
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
