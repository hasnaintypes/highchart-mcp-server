import { z } from 'zod/v4';

export const ChartTypeSchema = z.enum(
  ['line', 'bar', 'column', 'area', 'scatter', 'pie', 'spline', 'areaspline'],
  { error: 'type must be one of: line, bar, column, area, scatter, pie, spline, areaspline' },
);

export type ChartType = z.infer<typeof ChartTypeSchema>;

export const SeriesDataSchema = z.object({
  name: z.string().optional(),
  data: z.array(z.number({ error: 'series[].data values must be numbers' })),
});

export type SeriesData = z.infer<typeof SeriesDataSchema>;

export const CreateChartInputSchema = z.object({
  type: ChartTypeSchema,
  title: z.string().optional(),
  xAxisCategories: z.array(z.string()).optional(),
  series: z.array(SeriesDataSchema).min(1, { error: 'series must contain at least one data series' }),
});

export type CreateChartInput = z.infer<typeof CreateChartInputSchema>;

export interface HighchartsConfig {
  chart: { type: string };
  title: { text: string };
  xAxis?: { categories: string[] };
  series: Array<{ name?: string; data: number[] }>;
}

export const RenderChartInputSchema = z.object({
  chartOptions: z.object({
    chart: z.object({
      type: z.string({ error: 'chartOptions.chart.type is required and must be a Highcharts chart type string' }),
    }).passthrough(),
    series: z.array(z.record(z.string(), z.unknown())).min(1, {
      error: 'chartOptions.series must contain at least one series object',
    }),
  }).passthrough(),
});

export type RenderChartInput = z.infer<typeof RenderChartInputSchema>;
