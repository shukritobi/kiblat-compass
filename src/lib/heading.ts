import { normalize, signedTurn } from './geo';

export type CompassSource = 'ios-magnetic' | 'absolute-rotation';
export type HeadingSample = {
  heading: number;
  source: CompassSource;
  accuracy: number | null;
  beta: number | null;
  gamma: number | null;
  timestamp: number;
};

type OrientationSample = {
  absolute: boolean;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
};

/** Browsers offer different device reference frames. Require portrait to avoid unverified screen-axis corrections. */
export function parseOrientation(event: OrientationSample, screenAngle = 0, timestamp = Date.now()): HeadingSample | null {
  if (screenAngle !== 0) return null;
  // Safari supplies a *magnetic* heading; add WMM declination exactly once elsewhere.
  if (event.webkitCompassHeading != null && Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
    return {
      heading: normalize(event.webkitCompassHeading), source: 'ios-magnetic',
      accuracy: event.webkitCompassAccuracy != null && Number.isFinite(event.webkitCompassAccuracy) && event.webkitCompassAccuracy >= 0
        ? event.webkitCompassAccuracy : null,
      beta: event.beta, gamma: event.gamma, timestamp,
    };
  }
  // W3C absolute alpha is measured from geographic north in an absolute earth frame.
  // Never convert ordinary relative alpha into a claimed north-finding compass.
  if (!event.absolute || event.alpha == null || !Number.isFinite(event.alpha)) return null;
  return {
    heading: normalize(360 - event.alpha),
    source: 'absolute-rotation', accuracy: null,
    beta: event.beta, gamma: event.gamma, timestamp,
  };
}

export function smoothHeading(previous: number | null, next: number, fraction = 0.24): number {
  if (previous == null) return normalize(next);
  return normalize(previous + signedTurn(next, previous) * fraction);
}

/** The flat, screen-up device is a deliberate restriction: generic Euler heading on tilted phones isn't reliable. */
export function acceptableTilt(beta: number | null, gamma: number | null): boolean {
  return beta != null && gamma != null && Math.abs(beta) <= 25 && Math.abs(gamma) <= 25;
}
