import { describe, it, expect } from 'vitest';
import {
  families,
  allChartTypes,
  buildFromInput,
  CreateChartInputSchema,
  type ChartFamilyInput,
} from '../../../src/charts/index.js';

/**
 * Coverage guard: every registered series type must validate against the
 * create_chart schema and build a Highcharts options object with the family's
 * declared constructor. Inputs are derived from each family's example (members
 * of a family share the same input shape), overriding only `type`.
 */
describe('chart type matrix (all 70 types)', () => {
  for (const family of families) {
    for (const type of family.memberTypes) {
      it(`builds "${type}" (${family.id} → ${family.constr})`, () => {
        const example = family.example as Record<string, unknown>;
        const input = { ...example, type } as ChartFamilyInput;

        const parsed = CreateChartInputSchema.safeParse(input);
        expect(parsed.success, `schema should accept ${type}`).toBe(true);

        const built = buildFromInput(input);
        expect(built.constr).toBe(family.constr);
        expect(built.options).toHaveProperty('chart');
      });
    }
  }

  it('covers exactly the 70 known Highcharts series types', () => {
    expect(allChartTypes()).toHaveLength(70);
  });
});
