import { describe, it, expect } from 'vitest';

// No license id, but credits disable requested → must be forced back to true.
delete process.env['HIGHCHARTS_LICENSE_ID'];
process.env['HIGHCHARTS_CREDITS_ENABLED'] = 'false';

const { config } = await import('../../../src/config/index.js');

describe('config — Highcharts credits gating', () => {
  it('forces credits ON when no license id is provided, even if disable is requested', () => {
    expect(config.HIGHCHARTS_LICENSE_ID).toBeUndefined();
    expect(config.HIGHCHARTS_CREDITS_ENABLED).toBe(true);
  });
});
