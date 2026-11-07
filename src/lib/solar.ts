import * as SunCalc from 'suncalc';
import { normalize, signedTurn } from './geo';
import type { Coordinates } from './geo';

export type SolarReference = {
  azimuth: number;
  altitude: number;
  shadowBearing: number;
  turnFromShadow: number;
  usable: boolean;
};

/** SunCalc v2 returns azimuth and altitude in DEGREES clockwise from NORTH. */
export function solarReference(p: Coordinates, qiblaBearing: number, date = new Date()): SolarReference {
  const position = SunCalc.getPosition(date, p.latitude, p.longitude);
  const azimuth = normalize(position.azimuth);
  const shadowBearing = normalize(azimuth + 180);
  return {
    azimuth,
    altitude: position.altitude,
    shadowBearing,
    turnFromShadow: signedTurn(qiblaBearing, shadowBearing),
    usable: position.altitude >= 5 && position.altitude <= 80,
  };
}
