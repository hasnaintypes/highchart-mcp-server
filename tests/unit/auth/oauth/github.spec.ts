import { describe, it, expect } from 'vitest';
import { isAllowed } from '../../../../src/auth/oauth/github.js';

describe('isAllowed', () => {
  it('allows anyone when both allowlists are empty', () => {
    expect(isAllowed('anyone', [], [], [])).toBe(true);
  });

  it('allows a user on the allowlist (case-insensitive)', () => {
    expect(isAllowed('Alice', [], ['alice'], [])).toBe(true);
  });

  it('rejects a user not on the allowlist', () => {
    expect(isAllowed('bob', [], ['alice'], [])).toBe(false);
  });

  it('allows a user whose org is on the org allowlist (case-insensitive)', () => {
    expect(isAllowed('bob', ['Acme'], [], ['acme'])).toBe(true);
  });

  it('rejects a user whose orgs do not intersect the org allowlist', () => {
    expect(isAllowed('bob', ['other-org'], [], ['acme'])).toBe(false);
  });

  it('allows when either allowlist matches', () => {
    expect(isAllowed('bob', ['acme'], ['alice'], ['acme'])).toBe(true);
  });
});
