import { describe, it, expect, vi } from 'vitest';
import { getErrorMessage, handleToolError } from '../../../src/utils/errorHandler.js';

describe('getErrorMessage', () => {
  it('should extract message from Error instances', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('should stringify non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('string error');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(null)).toBe('null');
  });
});

describe('handleToolError', () => {
  it('should return the result when fn succeeds', async () => {
    const expected = { content: [{ type: 'text' as const, text: 'ok' }] };
    const result = await handleToolError('test_tool', async () => expected);
    expect(result).toBe(expected);
  });

  it('should catch errors and return errorResult', async () => {
    const result = await handleToolError('test_tool', async () => {
      throw new Error('something broke');
    });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('test_tool');
    expect(text).toContain('something broke');
  });

  it('should handle non-Error throws', async () => {
    const result = await handleToolError('test_tool', async () => {
      throw 'raw string';
    });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('raw string');
  });
});
