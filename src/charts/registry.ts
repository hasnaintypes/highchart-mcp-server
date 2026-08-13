import { z } from 'zod/v4';
import type { BuiltChart, ChartFamily, ChartFamilyInput } from './types.js';
import { families } from './families/index.js';

/** All registered chart families (source of truth for type coverage). */
export { families };

/** Map of series type -> owning family, built once at module load. */
const typeToFamily = new Map<string, ChartFamily>();
for (const family of families) {
  for (const type of family.memberTypes) {
    if (typeToFamily.has(type)) {
      throw new Error(
        `Duplicate chart type "${type}" registered by families ` +
          `"${typeToFamily.get(type)?.id}" and "${family.id}".`,
      );
    }
    typeToFamily.set(type, family);
  }
}

/** Returns the family that owns a given series type, if any. */
export function getFamilyForType(type: string): ChartFamily | undefined {
  return typeToFamily.get(type);
}

/** Flat, de-duplicated list of every supported series type. */
export function allChartTypes(): string[] {
  return [...typeToFamily.keys()];
}

/**
 * Discriminated union on `type` generated from every family. Each member type
 * becomes a variant of its family's `inputSchema` extended with a `type`
 * literal, preserving per-type error messages.
 */
type UnionVariant = z.ZodObject<z.ZodRawShape>;

function buildCreateChartSchema(): z.ZodTypeAny {
  const variants: UnionVariant[] = [];
  for (const family of families) {
    for (const type of family.memberTypes) {
      variants.push(family.inputSchema.extend({ type: z.literal(type) }));
    }
  }

  if (variants.length === 0) {
    throw new Error('No chart families registered; cannot build create_chart schema.');
  }

  return z.discriminatedUnion('type', variants as [UnionVariant, ...UnionVariant[]]);
}

export const CreateChartInputSchema = buildCreateChartSchema();

/**
 * Validates and builds a full Highcharts options object from create_chart
 * input, returning the options plus the constructor its family requires.
 * Throws if the type is unknown (should be unreachable after schema parse).
 */
export function buildFromInput(input: ChartFamilyInput): BuiltChart {
  const family = getFamilyForType(input.type);
  if (family === undefined) {
    throw new Error(`Unsupported chart type "${input.type}".`);
  }
  return { options: family.build(input), constr: family.constr };
}
