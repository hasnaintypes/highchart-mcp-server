import { describe, it, expect } from 'vitest';
import {
  families,
  getFamilyForType,
  allChartTypes,
  buildFromInput,
  CreateChartInputSchema,
} from '../../../src/charts/index.js';

describe('chart registry', () => {
  describe('getFamilyForType', () => {
    it('returns the owning family for a known type', () => {
      const family = getFamilyForType('line');
      expect(family).toBeDefined();
      expect(family?.memberTypes).toContain('line');
    });

    it('returns undefined for an unknown type', () => {
      expect(getFamilyForType('not-a-chart')).toBeUndefined();
    });
  });

  describe('allChartTypes', () => {
    it('lists every member type across all families with no duplicates', () => {
      const types = allChartTypes();
      const flattened = families.flatMap((f) => [...f.memberTypes]);
      expect(new Set(types).size).toBe(types.length);
      expect(new Set(types)).toEqual(new Set(flattened));
    });
  });

  describe('CreateChartInputSchema', () => {
    it('accepts a valid input for a known type', () => {
      const result = CreateChartInputSchema.safeParse({
        type: 'line',
        series: [{ data: [1, 2, 3] }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown chart type', () => {
      const result = CreateChartInputSchema.safeParse({
        type: 'heatmap-3000',
        series: [{ data: [1] }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects input missing required series', () => {
      const result = CreateChartInputSchema.safeParse({ type: 'bar' });
      expect(result.success).toBe(false);
    });
  });

  describe('buildFromInput', () => {
    it('builds options and reports the family constructor', () => {
      const built = buildFromInput({
        type: 'line',
        title: 'Sales',
        xAxisCategories: ['Jan', 'Feb'],
        series: [{ name: 'Rev', data: [1, 2] }],
      });

      expect(built.constr).toBe('chart');
      expect(built.options['chart']).toEqual({ type: 'line' });
      expect(built.options['title']).toEqual({ text: 'Sales' });
      expect(built.options['xAxis']).toEqual({ categories: ['Jan', 'Feb'] });
    });

    it('omits xAxis for pie charts even when categories are provided', () => {
      const built = buildFromInput({
        type: 'pie',
        xAxisCategories: ['A', 'B'],
        series: [{ data: [1, 2] }],
      });
      expect(built.options).not.toHaveProperty('xAxis');
    });

    it('throws for an unsupported type', () => {
      expect(() => buildFromInput({ type: 'bogus', series: [] })).toThrow(
        'Unsupported chart type',
      );
    });
  });
});
