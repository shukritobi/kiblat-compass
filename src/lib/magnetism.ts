import { magvar } from 'magvar';
import type { Coordinates } from './geo';
import { normalize } from './geo';

/** WMM2025. East magnetic declination is positive. Input altitude is meters; library expects km. */
export function magneticDeclination(p: Coordinates, altitudeMeters = 0, date = new Date()): number {
  if (date.getUTCFullYear() < 2025 || date.getUTCFullYear() >= 2030) {
    throw new RangeError('WMM2025 is valid for 2025–2029 only');
  }
  return magvar(p.latitude, p.longitude, (Number.isFinite(altitudeMeters) ? altitudeMeters : 0) / 1000, date);
}

/** Only apply to an explicitly magnetic heading; do NOT double-correct a known true heading. */
export function magneticToTrue(magneticHeading: number, eastDeclination: number): number {
  return normalize(magneticHeading + eastDeclination);
}
