import { describe, it, expect } from 'vitest';
import { buildHighchartsConfig } from '../../../src/services/chartService.js';

describe('buildHighchartsConfig', () => {
  it('should build a line chart with all options', () => {
    const config = buildHighchartsConfig({
      type: 'line',
      title: 'Sales Over Time',
      xAxisCategories: ['Jan', 'Feb', 'Mar'],
      series: [{ name: 'Revenue', data: [100, 200, 300] }],
    });

    expect(config).toEqual({
      chart: { type: 'line' },
      title: { text: 'Sales Over Time' },
      xAxis: { categories: ['Jan', 'Feb', 'Mar'] },
      series: [{ name: 'Revenue', data: [100, 200, 300] }],
    });
  });

  it('should omit xAxis for pie charts even when categories provided', () => {
    const config = buildHighchartsConfig({
      type: 'pie',
      title: 'Market Share',
      xAxisCategories: ['A', 'B', 'C'],
      series: [{ name: 'Share', data: [40, 30, 30] }],
    });

    expect(config.chart.type).toBe('pie');
    expect(config.xAxis).toBeUndefined();
  });

  it('should use empty string as default title when omitted', () => {
    const config = buildHighchartsConfig({
      type: 'bar',
      series: [{ data: [1, 2, 3] }],
    });

    expect(config.title.text).toBe('');
  });

  it('should omit series name when not provided', () => {
    const config = buildHighchartsConfig({
      type: 'column',
      series: [{ data: [10, 20] }],
    });

    expect(config.series[0]).toEqual({ data: [10, 20] });
    expect(config.series[0]).not.toHaveProperty('name');
  });

  it('should handle multiple series', () => {
    const config = buildHighchartsConfig({
      type: 'area',
      series: [
        { name: 'A', data: [1, 2] },
        { name: 'B', data: [3, 4] },
        { data: [5, 6] },
      ],
    });

    expect(config.series).toHaveLength(3);
    expect(config.series[0]).toEqual({ name: 'A', data: [1, 2] });
    expect(config.series[1]).toEqual({ name: 'B', data: [3, 4] });
    expect(config.series[2]).toEqual({ data: [5, 6] });
  });

  it('should omit xAxis when no categories provided', () => {
    const config = buildHighchartsConfig({
      type: 'line',
      series: [{ data: [1, 2, 3] }],
    });

    expect(config.xAxis).toBeUndefined();
  });
});
