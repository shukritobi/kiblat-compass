import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_KL, validCoordinates } from '../lib/geo';
import type { Coordinates } from '../lib/geo';

export type LocationState = {
  coords: Coordinates;
  altitudeMeters: number;
  accuracyMeters: number | null;
  mode: 'demo' | 'gps' | 'manual';
  status: string;
  updatedAt: number | null;
};

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    coords: { ...DEMO_KL }, altitudeMeters: 0, accuracyMeters: null,
    mode: 'demo', status: 'Sample Kuala Lumpur location. Enable GPS for your Qibla.', updatedAt: null,
  });
  const [loading, setLoading] = useState(false);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocation(previous => ({ ...previous, status: 'Geolocation is not supported on this browser.' }));
      return;
    }
    stop();
    setLoading(true);
    watchId.current = navigator.geolocation.watchPosition(
      position => {
        setLoading(false);
        setLocation({
          coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
          altitudeMeters: position.coords.altitude ?? 0,
          accuracyMeters: position.coords.accuracy,
          mode: 'gps', status: 'Live GPS location', updatedAt: Date.now(),
        });
      },
      error => {
        setLoading(false);
        setLocation(previous => ({ ...previous,
          status: error.code === 1 ? 'Location permission denied. Enter coordinates manually.' :
            `GPS unavailable (${error.message}). You can enter coordinates manually.`,
        }));
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }, [stop]);

  const manuallySet = useCallback((coords: Coordinates) => {
    if (!validCoordinates(coords)) return false;
    stop();
    setLoading(false);
    setLocation({ coords, altitudeMeters: 0, accuracyMeters: null,
      mode: 'manual', status: 'Manually entered location (not GPS verified)', updatedAt: Date.now() });
    return true;
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { location, loading, start, stop, manuallySet };
}
