// Dev-only: seed the highcharts-export-server cache from the local package.
//
// Starts the local mirror, points HIGHCHARTS_CDN_URL at it, and runs one
// initExport so the export server fetches + caches all Highcharts scripts into
// HIGHCHARTS_CACHE_PATH (default .hc-cache). After seeding, the server renders
// offline without the mirror.
//
// Run: `npm run seed:cache`

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { startMirror } from './highcharts-mirror.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// The export server resolves cachePath relative to its own package dir
// (node_modules/highcharts-export-server), so use a relative path that lands
// at the repo root: ../../.hc-cache
const cachePath = process.env.HIGHCHARTS_CACHE_PATH ?? '../../.hc-cache';

const mirror = await startMirror();
console.log(`[seed] mirror at ${mirror.url}`);

// Configure BEFORE importing the compiled service (config is read at load).
process.env.HIGHCHARTS_CDN_URL = mirror.url;
process.env.HIGHCHARTS_CACHE_PATH = cachePath;
process.env.HIGHCHARTS_FORCE_FETCH = 'true';

const { initExportService, shutdownExportService } = await import(
  pathToFileURL(join(repoRoot, 'dist', 'services', 'exportService.js')).href
);

try {
  console.log(`[seed] fetching + caching Highcharts (cachePath="${cachePath}") ...`);
  await initExportService();
  console.log('[seed] cache populated successfully.');
} catch (error) {
  console.error('[seed] failed:', error?.message ?? error);
  process.exitCode = 1;
} finally {
  await shutdownExportService().catch(() => {});
  await mirror.close();
}
