import { describe, it, expect } from 'vitest';
import { ExportChartInputSchema } from '../../../src/types/index.js';

describe('ExportChartInputSchema', () => {
  it('should accept valid svg input', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [{ data: [1, 2, 3] }],
      },
      format: 'svg',
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid png input', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'bar' },
        series: [{ name: 'A', data: [10, 20] }],
      },
      format: 'png',
    });

    expect(result.success).toBe(true);
  });

  it('should accept valid pdf input', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'column' },
        series: [{ data: [5] }],
      },
      format: 'pdf',
    });

    expect(result.success).toBe(true);
  });

  it('should accept with dimension overrides', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [{ data: [1] }],
      },
      format: 'png',
      width: 800,
      height: 600,
      scale: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.width).toBe(800);
      expect(result.data.height).toBe(600);
      expect(result.data.scale).toBe(2);
    }
  });

  it('should reject missing format', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [{ data: [1] }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid format', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [{ data: [1] }],
      },
      format: 'gif',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty series', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line' },
        series: [],
      },
      format: 'svg',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing chart.type', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: {},
        series: [{ data: [1] }],
      },
      format: 'svg',
    });

    expect(result.success).toBe(false);
  });

  it('should pass through extra chartOptions keys', () => {
    const result = ExportChartInputSchema.safeParse({
      chartOptions: {
        chart: { type: 'line', zoomType: 'x' },
        series: [{ data: [1] }],
        tooltip: { shared: true },
        legend: { enabled: false },
      },
      format: 'svg',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chartOptions.tooltip).toEqual({ shared: true });
      expect(result.data.chartOptions.legend).toEqual({ enabled: false });
    }
  });
});
