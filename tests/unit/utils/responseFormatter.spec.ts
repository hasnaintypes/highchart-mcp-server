import { describe, it, expect } from 'vitest';
import { successResult, jsonResult, errorResult } from '../../../src/utils/responseFormatter.js';

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
