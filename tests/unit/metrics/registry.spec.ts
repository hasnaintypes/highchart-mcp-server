import { describe, it, expect, beforeEach } from 'vitest';
import {
  incr,
  setGauge,
  observe,
  renderProm,
  snapshot,
  resetMetrics,
} from '../../../src/metrics/index.js';

describe('metrics registry', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('accumulates counters by label set', () => {
    incr('highchart_tool_invocations_total', { tool: 'create_chart', status: 'ok' });
    incr('highchart_tool_invocations_total', { tool: 'create_chart', status: 'ok' });
    incr('highchart_tool_invocations_total', { tool: 'create_chart', status: 'error' });

    const out = renderProm();
    expect(out).toContain('highchart_tool_invocations_total{status="ok",tool="create_chart"} 2');
    expect(out).toContain('highchart_tool_invocations_total{status="error",tool="create_chart"} 1');
  });

  it('emits HELP and TYPE headers', () => {
    incr('highchart_errors_total', { tool: 'x' }, 'Total MCP tool errors by tool.');
    const out = renderProm();
    expect(out).toContain('# HELP highchart_errors_total Total MCP tool errors by tool.');
    expect(out).toContain('# TYPE highchart_errors_total counter');
  });

  it('renders gauges with the latest value', () => {
    setGauge('highchart_export_pool_workers', 1);
    setGauge('highchart_export_pool_workers', 0);
    expect(renderProm()).toContain('highchart_export_pool_workers 0');
  });

  it('renders histogram buckets cumulatively with sum and count', () => {
    observe('highchart_export_duration_seconds', 0.03, { format: 'svg' });
    observe('highchart_export_duration_seconds', 0.4, { format: 'svg' });
    observe('highchart_export_duration_seconds', 3, { format: 'svg' });

    const out = renderProm();
    // 0.03 <= 0.05 bucket
    expect(out).toMatch(/highchart_export_duration_seconds_bucket\{format="svg",le="0\.05"\} 1/);
    // cumulative through le=1 includes 0.03 and 0.4 => 2
    expect(out).toMatch(/highchart_export_duration_seconds_bucket\{format="svg",le="1"\} 2/);
    // +Inf includes all 3
    expect(out).toMatch(/highchart_export_duration_seconds_bucket\{format="svg",le="\+Inf"\} 3/);
    expect(out).toContain('highchart_export_duration_seconds_count{format="svg"} 3');
    expect(out).toContain('highchart_export_duration_seconds_sum{format="svg"} 3.43');
  });

  it('always includes uptime gauge', () => {
    expect(renderProm()).toContain('highchart_uptime_seconds');
  });

  it('snapshot summarizes counters and histograms', () => {
    incr('highchart_errors_total', { tool: 'x' });
    observe('highchart_export_duration_seconds', 1, { format: 'png' });
    const snap = snapshot();
    expect(snap['counters']).toBeDefined();
    expect(snap['histograms']).toBeDefined();
    expect(typeof snap['uptimeSeconds']).toBe('number');
  });
});
