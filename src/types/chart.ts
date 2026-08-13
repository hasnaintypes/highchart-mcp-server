import { z } from 'zod/v4';

export const ExportFormatSchema = z.enum(
  ['svg', 'png', 'pdf'],
  { error: 'format must be one of: svg, png, pdf' },
);

export type ExportFormat = z.infer<typeof ExportFormatSchema>;

/**
 * Highcharts constructor selector for the raw passthrough tools. Defaults to
 * `chart`; use `stockChart` for financial/flags, `mapChart` for maps, and
 * `ganttChart` for gantt.
 */
export const ConstructorSchema = z.enum(
  ['chart', 'stockChart', 'mapChart', 'ganttChart'],
  { error: 'constr must be one of: chart, stockChart, mapChart, ganttChart' },
);

export type ConstructorType = z.infer<typeof ConstructorSchema>;

const ChartOptionsSchema = z.object({
  chart: z.object({
    type: z.string({ error: 'chartOptions.chart.type is required and must be a Highcharts chart type string' }),
  }).passthrough(),
  series: z.array(z.record(z.string(), z.unknown())).min(1, {
    error: 'chartOptions.series must contain at least one series object',
  }),
}).passthrough();

export const RenderChartInputSchema = z.object({
  chartOptions: ChartOptionsSchema,
  format: ExportFormatSchema.optional().default('svg'),
  constr: ConstructorSchema.optional(),
});

export type RenderChartInput = z.infer<typeof RenderChartInputSchema>;

export const ExportChartInputSchema = z.object({
  chartOptions: ChartOptionsSchema,
  format: ExportFormatSchema,
  constr: ConstructorSchema.optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().optional(),
});

export type ExportChartInput = z.infer<typeof ExportChartInputSchema>;
