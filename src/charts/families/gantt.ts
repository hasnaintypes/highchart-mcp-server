import { z } from 'zod/v4';
import type { ChartFamily, ChartFamilyInput } from '../types.js';
import { titleShape } from '../shared.js';

/**
 * Gantt charts rendered with the `ganttChart` constructor. Input is a list of
 * tasks; `start`/`end` accept epoch milliseconds or ISO date strings and are
 * normalized to milliseconds.
 */
const TaskSchema = z.object({
  id: z.string().optional(),
  name: z.string({ error: 'each gantt task requires a name' }),
  start: z.union([z.number(), z.string()]),
  end: z.union([z.number(), z.string()]),
  completed: z.number().min(0).max(1).optional(),
  dependency: z.union([z.string(), z.array(z.string())]).optional(),
  parent: z.string().optional(),
}).passthrough();

const inputSchema = z.object({
  ...titleShape,
  name: z.string().optional(),
  tasks: z.array(TaskSchema).min(1, { error: 'tasks must contain at least one task' }),
});

type GanttInput = ChartFamilyInput & z.infer<typeof inputSchema>;

function toMs(value: number | string): number {
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid gantt date "${value}" — use epoch ms or an ISO date string.`);
  }
  return parsed;
}

export const ganttFamily: ChartFamily = {
  id: 'gantt',
  memberTypes: ['gantt'],
  constr: 'ganttChart',
  inputSchema,
  description: 'Gantt project charts (tasks with start/end/dependencies) rendered with the ganttChart constructor.',
  dataShapeHint:
    'tasks: Array<{ id?, name, start: number|ISO, end: number|ISO, completed?, dependency?, parent? }>',
  example: {
    type: 'gantt',
    title: 'Sprint',
    tasks: [
      { id: 'design', name: 'Design', start: '2024-01-01', end: '2024-01-05' },
      { id: 'build', name: 'Build', start: '2024-01-05', end: '2024-01-12', dependency: 'design' },
    ],
  },
  build(input: ChartFamilyInput): Record<string, unknown> {
    const d = input as GanttInput;
    return {
      chart: {},
      title: { text: d.title ?? '' },
      ...(d.subtitle !== undefined ? { subtitle: { text: d.subtitle } } : {}),
      series: [
        {
          type: 'gantt',
          name: d.name ?? 'Tasks',
          data: d.tasks.map((t) => ({
            ...t,
            start: toMs(t.start),
            end: toMs(t.end),
          })),
        },
      ],
    };
  },
};
