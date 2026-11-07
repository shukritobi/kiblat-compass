# QiblaVector · Precision Qibla Compass

Privacy-first, installable **React + TypeScript + Vite** PWA for iPhone and Android. Hosted at **https://shukritobi.github.io/kiblat-compass/** when GitHub Pages is enabled and the deployment succeeds.

## Features

- **Qibla calculator:** spherical great-circle initial bearing to the Kaaba, with an independent WGS84 Vincenty cross-check. Results are reported in degrees clockwise from geographic north.
- **Live compass:** iOS Safari `webkitCompassHeading` is a *magnetic* heading and is corrected exactly once with WMM2025 (`magvar`). Absolute browser orientation headings are treated as true-north references; relative alpha is rejected. The app requires a phone held flat in portrait because generic browser Euler angles are not a universal tilt-compensated compass.
- **Solar reference:** SunCalc v2 astronomical sun azimuth, shadow direction and clockwise/counterclockwise rotation to Qibla. Optional 15-minute sensor calibration only after a person explicitly aligns their phone to a physical shadow, never by assuming a calculation alone verifies device alignment.
- **Maps:** OSM street tiles or Esri World Imagery, local bearing line, and a great-circle route to the Kaaba. The map is north-up and doesn't pretend to be compass-calibrated.
- **GPS/manual coordinates**, sensor quality warnings, app installation and offline caching for first-party app assets.
- **Privacy:** location and sensor data stay local. Third-party map tile servers receive tile requests if map mode is used. Google Fonts are optional network fonts.

## Technology & scientific limitations

A phone's magnetometer can suffer from metal objects, cases, power lines and poor calibration. The gyroscope cannot establish true north on its own. WMM is a correction for magnetic declination, not for local magnetic distortion. Browser devices do not consistently expose absolute heading or quality information. GPS horizontal accuracy is *not* heading accuracy, and GPS course/heading of travel is not the direction the phone points. **The app never guarantees sub-degree precision.** Solar-shadow mode is a complementary physical reference and must be used correctly by a human outdoors. For installation of prayer rooms or mosques, consult an established local measurement/survey method.

### Coordinate and angle conventions

- Fixed Kaaba point: `(21.422508, 39.826183)` decimal degrees.
- Displayed Qibla azimuth: spherical great-circle initial bearing, clockwise from true north. Ellipsoidal WGS84 azimuth shown separately for audit. Different accepted Qibla methodologies may produce slight differences.
- iOS `webkitCompassHeading`: magnetic north heading; apply `true = magnetic + east-positive WMM2025 declination`.
- Android/W3C `deviceorientationabsolute` or `absolute=true`: use true-north absolute reference without magnetic correction. W3C `alpha` conventions are browser/device-sensitive; require physical testing before trusting precision.
- SunCalc v2: azimuth from geographic north clockwise in degrees; shadow line points `sun azimuth + 180°`.
- The app starts on a clearly labelled **DEMO Kuala Lumpur location**, never assuming the user is in Malaysia.

## Develop

Node.js 22 is recommended.

```bash
npm install
npm run dev
npm run check
npm run build
```

The CI workflow currently uses `npm install` because the first project commit does not contain a lockfile. Commit `package-lock.json` after the first successful install and switch CI to `npm ci` for reproducible builds.

## Deploy to GitHub Pages

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` installs, tests, builds and publishes `dist`.
3. Vite's `base` is `/kiblat-compass/`. PWA assets, service worker scope and manifest use that path.
4. Test the resulting URL on HTTPS. From iPhone Safari, tap Share → Add to Home Screen. On Android Chrome, Install app/Add to Home screen.

## Testing guide

1. Run unit tests for London, Kuala Lumpur, New York bearing geometry, WGS84 cross-check, angle wrap, source-specific north handling, WMM and solar sanity.
2. Compare the calculated bearing with trusted local official Qibla references. Test several locations, not just one.
3. Test permission granted/denied and GPS unavailable/manual fallback on actual iOS and Android devices.
4. With the phone **flat, portrait, outside**, turn in a full circle. Check stable 0°/360° crossing, compare to independently surveyed or solar reference directions.
5. Repeat near metal cabinets, chargers and vehicles to confirm warnings, not claims of verification.
6. Confirm the shadow is physically correct; calibrate only after aligning the physical top edge with the shadow. Confirm expiry or relocation resets the offset.
7. Visit once online, disable internet, refresh and verify the compass UI and solar math remain available. Map tiles require internet unless previously loaded in the browser outside the PWA cache.

## Libraries / references

- [WMM2025 model](https://www.ncei.noaa.gov/products/world-magnetic-model) and [`magvar`](https://github.com/dpyeates/magvar)
- [SunCalc v2](https://github.com/mourner/suncalc) by Vladimir Agafonkin; note v2's changed units.
- [W3C Device Orientation](https://www.w3.org/TR/orientation-event/) and [Apple `webkitCompassHeading`](https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804777-webkitcompassheading)
- [GitHub Pages Vite deploy instructions](https://vite.dev/guide/static-deploy)

## Licence

MIT for project source. Third-party dependencies and map imagery retain their original licences and attribution.
