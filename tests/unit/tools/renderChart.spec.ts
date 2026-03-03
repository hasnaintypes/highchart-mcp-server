import { describe, it, expect } from 'vitest';
import { RenderChartInputSchema } from '../../../src/types/index.js';

describe('RenderChartInputSchema', () => {
  it('should accept a valid full Highcharts config', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line', zoomType: 'x' },
        title: { text: 'Revenue' },
        tooltip: { shared: true },
        legend: { enabled: true },
        series: [{ name: 'Sales', data: [1, 2, 3] }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('should accept a minimal valid config', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'bar' },
        series: [{ data: [1, 2, 3] }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('should pass through extra keys on chart object', () => {
    const input = {
      chartOptions: {
        chart: { type: 'line', zoomType: 'xy', backgroundColor: '#fff' },
        series: [{ data: [1] }],
      },
    };

    const result = RenderChartInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chartOptions.chart).toEqual({
        type: 'line',
        zoomType: 'xy',
        backgroundColor: '#fff',
      });
    }
  });

  it('should pass through extra keys on chartOptions', () => {
    const input = {
      chartOptions: {
        chart: { type: 'line' },
        series: [{ data: [1] }],
        tooltip: { shared: true, crosshairs: true },
        plotOptions: { line: { marker: { enabled: false } } },
      },
    };

    const result = RenderChartInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chartOptions.tooltip).toEqual({ shared: true, crosshairs: true });
      expect(result.data.chartOptions.plotOptions).toEqual({
        line: { marker: { enabled: false } },
      });
    }
  });

  it('should accept any chart type string', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'waterfall' },
        series: [{ data: [1] }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('should accept multiple series with different structures', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'column' },
        series: [
          { name: 'A', data: [1, 2], color: '#f00' },
          { type: 'line', data: [3, 4] },
          { name: 'C', data: [5, 6], dashStyle: 'ShortDash' },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it('should reject missing chart key', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        series: [{ data: [1, 2, 3] }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing series key', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty series array', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing chart.type', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: {},
        series: [{ data: [1, 2, 3] }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing chartOptions wrapper', () => {
    const result = RenderChartInputSchema.safeParse({
      chart: { type: 'line' },
      series: [{ data: [1] }],
    });

    expect(result.success).toBe(false);
  });
});

describe('RenderChartInputSchema error messages', () => {
  it('should mention chart.type when type is missing', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: {},
        series: [{ data: [1] }],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('type');
    }
  });

  it('should mention "at least one" when series is empty', () => {
    const result = RenderChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [],
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('at least one');
    }
  });
});
