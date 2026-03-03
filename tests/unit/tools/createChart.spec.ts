import { describe, it, expect } from 'vitest';
import { CreateChartInputSchema } from '../../../src/types/index.js';

describe('CreateChartInputSchema', () => {
  it('should accept valid input', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      title: 'Test',
      series: [{ name: 'A', data: [1, 2, 3] }],
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid chart type', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'heatmap',
      series: [{ data: [1] }],
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty series', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      series: [],
    });

    expect(result.success).toBe(false);
  });

  it('should reject series with non-number data', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      series: [{ data: ['a', 'b'] }],
    });

    expect(result.success).toBe(false);
  });

  it('should accept input without optional fields', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'bar',
      series: [{ data: [1] }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBeUndefined();
      expect(result.data.xAxisCategories).toBeUndefined();
    }
  });
});

describe('CreateChartInputSchema error messages', () => {
  it('should list valid types when chart type is invalid', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'heatmap',
      series: [{ data: [1] }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('line');
      expect(result.error.issues[0]!.message).toContain('bar');
      expect(result.error.issues[0]!.message).toContain('pie');
    }
  });

  it('should mention "at least one" when series is empty', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      series: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('at least one');
    }
  });

  it('should mention data values must be numbers for non-number data', () => {
    const result = CreateChartInputSchema.safeParse({
      type: 'line',
      series: [{ data: ['a', 'b'] }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('must be numbers');
    }
  });
});
