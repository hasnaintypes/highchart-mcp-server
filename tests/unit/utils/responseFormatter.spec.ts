import { describe, it, expect } from 'vitest';
import {
  successResult,
  jsonResult,
  errorResult,
  chartRenderResult,
} from '../../../src/utils/responseFormatter.js';

describe('successResult', () => {
  it('should wrap text in content array', () => {
    const result = successResult('Chart created');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Chart created' }],
    });
  });

  it('should not set isError', () => {
    const result = successResult('ok');
    expect(result.isError).toBeUndefined();
  });
});

describe('jsonResult', () => {
  it('should JSON.stringify data with indentation', () => {
    const data = { chart: { type: 'line' }, series: [{ data: [1, 2] }] };
    const result = jsonResult(data);

    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { text: string }).text;
    expect(JSON.parse(text)).toEqual(data);
    expect(text).toContain('\n');
  });

  it('should not set isError', () => {
    const result = jsonResult({ ok: true });
    expect(result.isError).toBeUndefined();
  });
});

describe('errorResult', () => {
  it('should wrap message in content array with isError true', () => {
    const result = errorResult('Something failed');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Something failed' }],
      isError: true,
    });
  });
});

describe('chartRenderResult', () => {
  it('should add a base64 image block for svg (raw XML -> base64)', () => {
    const svg = '<svg><rect/></svg>';
    const result = chartRenderResult({ config: { chart: { type: 'line' } }, format: 'svg', data: svg });

    expect(result.content[0]).toEqual({
      type: 'image',
      mimeType: 'image/svg+xml',
      data: Buffer.from(svg, 'utf-8').toString('base64'),
    });
    const text = (result.content[1] as { text: string }).text;
    expect(JSON.parse(text)).toEqual({ config: { chart: { type: 'line' } }, format: 'svg', data: svg });
  });

  it('should add an image block for png using the already-base64 data as-is', () => {
    const base64Png = 'aGVsbG8=';
    const result = chartRenderResult({ config: {}, format: 'png', data: base64Png });

    expect(result.content[0]).toEqual({ type: 'image', mimeType: 'image/png', data: base64Png });
  });

  it('should NOT add an image block for pdf (text-only, unchanged)', () => {
    const result = chartRenderResult({ config: {}, format: 'pdf', data: 'base64pdf' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });
});
