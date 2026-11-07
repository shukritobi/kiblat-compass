import { describe, expect, it } from 'vitest';
import { cardinal, DEMO_KL, destination, greatCirclePoints, initialBearing, KAABA, normalize, signedTurn, validCoordinates, wgs84Bearing } from './geo';

describe('Geodesy and Qibla initial bearings', () => {
  it('returns a plausible Kuala Lumpur great-circle Qibla direction', () => {
    const bearing = initialBearing(DEMO_KL);
    expect(bearing).toBeGreaterThan(292);
    expect(bearing).toBeLessThan(293);
  });
  it('points London approximately southeast and New York northeast', () => {
    expect(initialBearing({ latitude: 51.5074, longitude: -0.1278 })).toBeCloseTo(119, 0);
    expect(initialBearing({ latitude: 40.7128, longitude: -74.0060 })).toBeGreaterThan(50);
    expect(initialBearing({ latitude: 40.7128, longitude: -74.0060 })).toBeLessThan(65);
  });
  it('preserves compass wraparound and signed shortest turn', () => {
    expect(normalize(-10)).toBe(350);
    expect(signedTurn(5, 355)).toBe(10);
    expect(signedTurn(355, 5)).toBe(-10);
    expect(cardinal(292)).toBe('WNW');
  });
  it('rejects invalid coordinates and undefined coincidence', () => {
    expect(validCoordinates({ latitude: 95, longitude: 4 })).toBe(false);
    expect(() => initialBearing({ latitude: 99, longitude: 4 })).toThrow();
    expect(() => initialBearing(KAABA)).toThrow();
  });
  it('has an independent WGS84 cross-check with a small model difference', () => {
    const ellipsoid = wgs84Bearing(DEMO_KL);
    expect(ellipsoid).not.toBeNull();
    expect(Math.abs(ellipsoid! - initialBearing(DEMO_KL))).toBeLessThan(0.5);
  });
  it('constructs a forward local map line and terminating great circle', () => {
    const target = destination(DEMO_KL, initialBearing(DEMO_KL), 3000);
    expect(initialBearing(DEMO_KL, target)).toBeCloseTo(initialBearing(DEMO_KL), 5);
    const line = greatCirclePoints(DEMO_KL);
    expect(line[0].latitude).toBeCloseTo(DEMO_KL.latitude, 6);
    expect(line.at(-1)!.longitude).toBeCloseTo(KAABA.longitude, 6);
  });
});
