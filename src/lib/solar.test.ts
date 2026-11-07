import { describe, expect, it } from 'vitest';
import { solarReference } from './solar';
import { DEMO_KL, initialBearing, signedTurn } from './geo';

describe('Solar verification geometry', () => {
  it('places the shadow exactly opposite from sun azimuth', () => {
    const result = solarReference(DEMO_KL, initialBearing(DEMO_KL), new Date('2026-06-21T05:00:00.000Z'));
    expect(Math.abs(signedTurn(result.shadowBearing, (result.azimuth + 180) % 360))).toBeLessThan(1e-8);
    expect(result.altitude).toBeGreaterThan(0);
  });
  it('rejects sun reference at night', () => {
    const result = solarReference(DEMO_KL, initialBearing(DEMO_KL), new Date('2026-06-21T17:00:00.000Z'));
    expect(result.usable).toBe(false);
  });
});
