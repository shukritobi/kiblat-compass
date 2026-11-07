/** Bearings are clockwise degrees from geographic north. */
export type Coordinates = { latitude: number; longitude: number };

// Approximate geographical centre of the Kaaba. A single frozen reference is used in all modes.
export const KAABA: Readonly<Coordinates> = Object.freeze({ latitude: 21.422508, longitude: 39.826183 });
// This is DEMO data, never silently presented as the user's actual location.
export const DEMO_KL: Readonly<Coordinates> = Object.freeze({ latitude: 3.1390, longitude: 101.6869 });
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
export const toRad = (degrees: number) => degrees * RAD;
export const toDeg = (radians: number) => radians * DEG;
export const normalize = (degrees: number): number => ((degrees % 360) + 360) % 360;
/** Returns -180 to +180 degrees, clockwise positive. */
export const signedTurn = (target: number, current: number): number => ((target - current + 540) % 360) - 180;

export function validCoordinates(p: Coordinates): boolean {
  return Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}

/** Conventional spherical great-circle initial bearing, degrees clockwise from true north. */
export function initialBearing(from: Coordinates, to: Coordinates = KAABA): number {
  if (!validCoordinates(from) || !validCoordinates(to)) throw new RangeError('Invalid coordinates');
  const p1 = toRad(from.latitude), p2 = toRad(to.latitude);
  const delta = toRad(to.longitude - from.longitude);
  const y = Math.sin(delta) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(delta);
  if (Math.hypot(x, y) < 1e-12) throw new RangeError('Bearing is undefined at coincident or antipodal points');
  return normalize(toDeg(Math.atan2(y, x)));
}

/** Vincenty WGS84 inverse for independent *ellipsoidal* cross-check; not used as religious standard by default. */
export function wgs84Bearing(from: Coordinates, to: Coordinates = KAABA): number | null {
  if (!validCoordinates(from) || !validCoordinates(to)) return null;
  const a = 6378137, f = 1 / 298.257223563, b = a * (1 - f);
  const L = toRad(to.longitude - from.longitude);
  const U1 = Math.atan((1 - f) * Math.tan(toRad(from.latitude)));
  const U2 = Math.atan((1 - f) * Math.tan(toRad(to.latitude)));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lambda = L;
  for (let i = 0; i < 200; i++) {
    const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    const sinSigma = Math.hypot(cosU2 * sinLambda,
      cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
    if (sinSigma < 1e-14) return null;
    const cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    const sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    const cosSqAlpha = 1 - sinAlpha * sinAlpha;
    const cos2SigmaM = cosSqAlpha < 1e-14 ? 0 : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const next = L + (1 - C) * f * sinAlpha *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    if (Math.abs(next - lambda) < 1e-12) {
      return normalize(toDeg(Math.atan2(cosU2 * Math.sin(next),
        cosU1 * sinU2 - sinU1 * cosU2 * Math.cos(next))));
    }
    lambda = next;
  }
  // Vincenty is not guaranteed to converge near antipodal points.
  void b;
  return null;
}

/** Destination along a spherical great circle. distanceMeters is used for short map guide lines. */
export function destination(from: Coordinates, bearingDegrees: number, distanceMeters: number): Coordinates {
  const d = distanceMeters / 6371008.8;
  const p1 = toRad(from.latitude), l1 = toRad(from.longitude), bearing = toRad(bearingDegrees);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(bearing));
  const l2 = l1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { latitude: toDeg(p2), longitude: ((toDeg(l2) + 540) % 360) - 180 };
}

export function greatCirclePoints(from: Coordinates, to: Coordinates = KAABA, steps = 80): Coordinates[] {
  const p1 = toRad(from.latitude), l1 = toRad(from.longitude);
  const p2 = toRad(to.latitude), l2 = toRad(to.longitude);
  const a: [number, number, number] = [Math.cos(p1) * Math.cos(l1), Math.cos(p1) * Math.sin(l1), Math.sin(p1)];
  const b: [number, number, number] = [Math.cos(p2) * Math.cos(l2), Math.cos(p2) * Math.sin(l2), Math.sin(p2)];
  const omega = Math.acos(Math.min(1, Math.max(-1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2])));
  if (omega < 1e-10) return [from, to];
  const result: Coordinates[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, s = Math.sin(omega);
    const u = Math.sin((1 - t) * omega) / s, v = Math.sin(t * omega) / s;
    const x = u * a[0] + v * b[0], y = u * a[1] + v * b[1], z = u * a[2] + v * b[2];
    result.push({ latitude: toDeg(Math.atan2(z, Math.hypot(x, y))), longitude: toDeg(Math.atan2(y, x)) });
  }
  return result;
}

export function cardinal(bearing: number): string {
  return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(normalize(bearing) / 22.5) % 16];
}
