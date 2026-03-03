import type { CreateChartInput, HighchartsConfig } from '../types/index.js';

export function buildHighchartsConfig(input: CreateChartInput): HighchartsConfig {
  const config: HighchartsConfig = {
    chart: { type: input.type },
    title: { text: input.title ?? '' },
    series: input.series.map((s) => ({
      ...(s.name !== undefined ? { name: s.name } : {}),
      data: s.data,
    })),
  };

  if (input.xAxisCategories !== undefined && input.type !== 'pie') {
    config.xAxis = { categories: input.xAxisCategories };
  }

  return config;
}
