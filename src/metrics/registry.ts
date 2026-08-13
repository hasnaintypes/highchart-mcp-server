/**
 * Tiny, dependency-free in-process metrics registry with a Prometheus text
 * exposition renderer. Works on both transports (STDIO + HTTP).
 *
 * Supports counters, histograms (fixed buckets) and gauges. Labels are encoded
 * into a stable series key. This intentionally avoids a heavy client library.
 */

type Labels = Record<string, string | number>;

interface HistogramData {
  buckets: number[];
  counts: number[]; // per-bucket cumulative counts are computed at render time
  bucketHits: number[]; // hits per (non-cumulative) bucket index; last = +Inf
  sum: number;
  count: number;
}

const DEFAULT_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histograms = new Map<string, HistogramData>();

// Metadata for HELP/TYPE lines, keyed by metric name (without labels).
const metricHelp = new Map<string, string>();
const metricType = new Map<string, 'counter' | 'gauge' | 'histogram'>();

const startTime = Date.now();

function encodeLabels(labels?: Labels): string {
  if (labels === undefined) return '';
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  const parts = keys.map((k) => `${k}="${String(labels[k]).replace(/["\\\n]/g, '\\$&')}"`);
  return `{${parts.join(',')}}`;
}

function seriesKey(name: string, labels?: Labels): string {
  return `${name}${encodeLabels(labels)}`;
}

/** Registers metric metadata (idempotent). */
function register(name: string, type: 'counter' | 'gauge' | 'histogram', help: string): void {
  if (!metricType.has(name)) {
    metricType.set(name, type);
    metricHelp.set(name, help);
  }
}

export function incr(name: string, labels?: Labels, help = '', value = 1): void {
  register(name, 'counter', help);
  const key = seriesKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + value);
}

export function setGauge(name: string, value: number, labels?: Labels, help = ''): void {
  register(name, 'gauge', help);
  gauges.set(seriesKey(name, labels), value);
}

export function observe(
  name: string,
  value: number,
  labels?: Labels,
  help = '',
  buckets: number[] = DEFAULT_BUCKETS,
): void {
  register(name, 'histogram', help);
  const key = seriesKey(name, labels);
  let h = histograms.get(key);
  if (h === undefined) {
    h = {
      buckets,
      counts: [],
      bucketHits: new Array(buckets.length + 1).fill(0),
      sum: 0,
      count: 0,
    };
    histograms.set(key, h);
  }
  h.sum += value;
  h.count += 1;
  let placed = false;
  for (let i = 0; i < h.buckets.length; i += 1) {
    if (value <= h.buckets[i]!) {
      h.bucketHits[i]! += 1;
      placed = true;
      break;
    }
  }
  if (!placed) h.bucketHits[h.buckets.length]! += 1; // +Inf bucket
}

/** Seconds since the process/metrics registry started. */
export function uptimeSeconds(): number {
  return (Date.now() - startTime) / 1000;
}

/** Clears all metrics (test helper). */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
  metricHelp.clear();
  metricType.clear();
}

function splitKey(key: string): { name: string; labels: string } {
  const brace = key.indexOf('{');
  if (brace === -1) return { name: key, labels: '' };
  return { name: key.slice(0, brace), labels: key.slice(brace) };
}

function labelsToInner(labels: string): string {
  // labels is '{a="b",c="d"}' or ''
  return labels === '' ? '' : labels.slice(1, -1);
}

/** Renders all metrics in Prometheus text exposition format (v0.0.4). */
export function renderProm(): string {
  setGauge('highchart_uptime_seconds', uptimeSeconds(), undefined, 'Process uptime in seconds.');

  const lines: string[] = [];
  const emitted = new Set<string>();

  const emitHeader = (name: string): void => {
    if (emitted.has(name)) return;
    emitted.add(name);
    const help = metricHelp.get(name);
    const type = metricType.get(name);
    if (help) lines.push(`# HELP ${name} ${help}`);
    if (type) lines.push(`# TYPE ${name} ${type}`);
  };

  for (const [key, value] of counters) {
    const { name } = splitKey(key);
    emitHeader(name);
    lines.push(`${key} ${value}`);
  }

  for (const [key, value] of gauges) {
    const { name } = splitKey(key);
    emitHeader(name);
    lines.push(`${key} ${value}`);
  }

  for (const [key, h] of histograms) {
    const { name, labels } = splitKey(key);
    emitHeader(name);
    const inner = labelsToInner(labels);
    let cumulative = 0;
    for (let i = 0; i < h.buckets.length; i += 1) {
      cumulative += h.bucketHits[i]!;
      const le = String(h.buckets[i]);
      const lbl = inner === '' ? `le="${le}"` : `${inner},le="${le}"`;
      lines.push(`${name}_bucket{${lbl}} ${cumulative}`);
    }
    cumulative += h.bucketHits[h.buckets.length]!;
    const infLbl = inner === '' ? 'le="+Inf"' : `${inner},le="+Inf"`;
    lines.push(`${name}_bucket{${infLbl}} ${cumulative}`);
    lines.push(`${name}_sum${labels} ${h.sum}`);
    lines.push(`${name}_count${labels} ${h.count}`);
  }

  return `${lines.join('\n')}\n`;
}

/** Compact JSON snapshot (for /health and STDIO logging). */
export function snapshot(): Record<string, unknown> {
  return {
    uptimeSeconds: Math.round(uptimeSeconds()),
    counters: Object.fromEntries(counters),
    gauges: Object.fromEntries(gauges),
    histograms: Object.fromEntries(
      [...histograms].map(([k, h]) => [k, { count: h.count, sum: h.sum }]),
    ),
  };
}
