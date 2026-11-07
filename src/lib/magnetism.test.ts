import { describe, expect, it } from 'vitest';
import { magneticDeclination, magneticToTrue } from './magnetism';
import { DEMO_KL } from './geo';

describe('WMM2025', () => {
  it('returns a bounded magnetic declination for Malaysia', () => {
    const d = magneticDeclination(DEMO_KL, 0, new Date('2026-11-07T00:00:00Z'));
    expect(Number.isFinite(d)).toBe(true);
    expect(Math.abs(d)).toBeLessThan(10);
  });
  it('only adjusts headings when explicitly asked to convert magnetic to true', () => {
    expect(magneticToTrue(358, 5)).toBe(3);
  });
  it('rejects times outside WMM2025 validity', () => {
    expect(() => magneticDeclination(DEMO_KL, 0, new Date('2031-01-01'))).toThrow();
  });
});
