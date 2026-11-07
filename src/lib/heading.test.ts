import { describe, expect, it } from 'vitest';
import { acceptableTilt, parseOrientation, smoothHeading } from './heading';
import { magneticToTrue } from './magnetism';

describe('Compass heading safety', () => {
  it('does not interpret relative-only device alpha as north', () => {
    expect(parseOrientation({ absolute: false, alpha: 110, beta: 0, gamma: 0 })).toBeNull();
  });
  it('correctly treats iOS webkit heading as magnetic and takes priority', () => {
    const result = parseOrientation({ absolute: false, alpha: 110, beta: 0, gamma: 0, webkitCompassHeading: 270, webkitCompassAccuracy: 4 });
    expect(result?.source).toBe('ios-magnetic');
    expect(magneticToTrue(result!.heading, 2.25)).toBe(272.25);
  });
  it('uses absolute orientation without double magnetic correction', () => {
    const result = parseOrientation({ absolute: true, alpha: 270, beta: 0, gamma: 0 });
    expect(result?.source).toBe('absolute-rotation');
    expect(result?.heading).toBe(90);
  });
  it('rejects missing north frame, invalid iOS heading, or sideways screen', () => {
    expect(parseOrientation({ absolute: true, alpha: null, beta: 0, gamma: 0 })).toBeNull();
    expect(parseOrientation({ absolute: true, alpha: 30, beta: 0, gamma: 0 }, 90)).toBeNull();
    expect(parseOrientation({ absolute: false, alpha: 30, beta: 0, gamma: 0, webkitCompassHeading: -1 })).toBeNull();
  });
  it('smooths angles across the north wrap without swinging around', () => {
    expect(smoothHeading(359, 1, 0.5)).toBe(0);
    expect(smoothHeading(1, 359, 0.5)).toBe(0);
  });
  it('requires a flat phone for the basic compass heading', () => {
    expect(acceptableTilt(0, 0)).toBe(true);
    expect(acceptableTilt(65, 0)).toBe(false);
    expect(acceptableTilt(null, 0)).toBe(false);
  });
});
