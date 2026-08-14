import { readFile, writeFile } from 'node:fs/promises';
import type { ExportFormat } from '../services/index.js';

/** Reads input from a file path, or from stdin when the path is `-`/undefined. */
export async function readInput(path: string | undefined): Promise<string> {
  if (path === undefined || path === '-') {
    return readStdin();
  }
  return readFile(path, 'utf8');
}

/** Reads all of stdin as a UTF-8 string. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Parses a JSON string, throwing a friendly error on failure. */
export function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON input: ${message}`);
  }
}

/**
 * Writes rendered chart output. SVG is UTF-8 text; PNG/PDF are base64 from the
 * export server and are decoded to binary when writing to a file.
 */
export async function writeOutput(
  data: string,
  format: ExportFormat,
  outPath: string | undefined,
): Promise<void> {
  if (outPath === undefined) {
    // No file target: print SVG as-is; print base64 for binary formats.
    process.stdout.write(data.endsWith('\n') ? data : `${data}\n`);
    return;
  }
  if (format === 'svg') {
    await writeFile(outPath, data, 'utf8');
  } else {
    await writeFile(outPath, Buffer.from(data, 'base64'));
  }
}

/** Writes a JSON value to stdout (pretty-printed). */
export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
