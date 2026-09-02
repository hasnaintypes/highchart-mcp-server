import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyPkce } from '../../../../src/auth/oauth/pkce.js';

function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

describe('verifyPkce', () => {
  it('accepts a matching S256 verifier/challenge pair', () => {
    const verifier = 'a-random-verifier-string-1234567890';
    expect(verifyPkce(verifier, challengeFor(verifier), 'S256')).toBe(true);
  });

  it('rejects a mismatched verifier', () => {
    expect(verifyPkce('wrong-verifier', challengeFor('right-verifier'), 'S256')).toBe(false);
  });

  it('rejects any method other than S256', () => {
    const verifier = 'plain-verifier';
    expect(verifyPkce(verifier, verifier, 'plain')).toBe(false);
  });
});
