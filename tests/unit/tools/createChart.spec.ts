import { describe, it, expect } from 'vitest';
import {
  CreateChartInputSchema,
  buildFromInput,
  allChartTypes,
  type ChartFamilyInput,
} from '../../../src/charts/index.js';

describe('CreateChartInputSchema (registry)', () => {
  it('accepts a valid line chart', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      title: 'Test',
      series: [{ name: 'A', data: [1, 2, 3] }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts advanced types (heatmap, sankey, candlestick, gauge)', () => {
    expect(
      CreateChartInputSchema.safeParse({
        type: 'heatmap',
        series: [{ data: [[0, 0, 5]] }],
      }).success,
    ).toBe(true);

    expect(
      CreateChartInputSchema.safeParse({
        type: 'sankey',
        series: [{ data: [{ from: 'A', to: 'B', weight: 2 }] }],
      }).success,
    ).toBe(true);

    expect(
      CreateChartInputSchema.safeParse({
        type: 'candlestick',
        series: [{ data: [[1, 2, 3, 1, 2]] }],
      }).success,
    ).toBe(true);

    expect(
      CreateChartInputSchema.safeParse({ type: 'gauge', series: [{ data: [80] }] }).success,
    ).toBe(true);
  });

  it('rejects an unknown chart type', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'definitely-not-a-chart',
      series: [{ data: [1] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty series for a cartesian type', () => {
    const result = CreateChartInputSchema.safeParse({ type: 'line', series: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('at least one');
    }
  });

  it('requires baseData for distribution types', () => {
    expect(CreateChartInputSchema.safeParse({ type: 'histogram' }).success).toBe(false);
    expect(
      CreateChartInputSchema.safeParse({ type: 'histogram', baseData: [1, 2, 3] }).success,
    ).toBe(true);
  });

  it('requires tasks for gantt', () => {
    expect(CreateChartInputSchema.safeParse({ type: 'gantt' }).success).toBe(false);
    expect(
      CreateChartInputSchema.safeParse({
        type: 'gantt',
        tasks: [{ name: 'A', start: 0, end: 1 }],
      }).success,
    ).toBe(true);
  });
});

describe('buildFromInput per family', () => {
  it('cartesian → constr chart with xAxis categories', () => {
    const built = buildFromInput({
      type: 'column',
      xAxisCategories: ['A', 'B'],
      series: [{ data: [1, 2] }],
    });
    expect(built.constr).toBe('chart');
    expect(built.options['xAxis']).toEqual({ categories: ['A', 'B'] });
  });

  it('financial → constr stockChart with datetime xAxis', () => {
    const built = buildFromInput({
      type: 'candlestick',
      series: [{ data: [[1, 2, 3, 1, 2]] }],
    });
    expect(built.constr).toBe('stockChart');
    expect(built.options['xAxis']).toEqual({ type: 'datetime' });
  });

  it('heatmap → adds colorAxis', () => {
    const built = buildFromInput({ type: 'heatmap', series: [{ data: [[0, 0, 1]] }] });
    expect(built.options['colorAxis']).toBeDefined();
  });

  it('maps → constr mapChart', () => {
    const built = buildFromInput({
      type: 'map',
      topology: { type: 'FeatureCollection', features: [] },
      data: [{ 'hc-key': 'us-ca', value: 1 }],
    } as ChartFamilyInput);
    expect(built.constr).toBe('mapChart');
  });

  it('gantt → constr ganttChart and normalizes ISO dates to ms', () => {
    const built = buildFromInput({
      type: 'gantt',
      tasks: [{ name: 'Design', start: '2024-01-01', end: '2024-01-05' }],
    } as ChartFamilyInput);
    expect(built.constr).toBe('ganttChart');
    const series = built.options['series'] as Array<{ data: Array<{ start: number; end: number }> }>;
    expect(typeof series[0]!.data[0]!.start).toBe('number');
  });

  it('distribution → builds base + derived series', () => {
    const built = buildFromInput({ type: 'histogram', baseData: [1, 2, 3] } as ChartFamilyInput);
    const series = built.options['series'] as Array<{ id?: string; baseSeries?: string }>;
    expect(series[0]!.id).toBe('base');
    expect(series[1]!.baseSeries).toBe('base');
  });
});

describe('coverage', () => {
  it('registers all 70 Highcharts series types', () => {
    expect(allChartTypes()).toHaveLength(70);
  });
});
