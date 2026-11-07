import { useCallback, useEffect, useRef, useState } from 'react';
import { parseOrientation, smoothHeading } from '../lib/heading';
import type { HeadingSample } from '../lib/heading';

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number | null;
  webkitCompassAccuracy?: number | null;
}
interface OrientationPermissionConstructor {
  requestPermission?: (absolute?: boolean) => Promise<'granted' | 'denied'>;
}

export function useCompass() {
  const [sample, setSample] = useState<HeadingSample | null>(null);
  const [status, setStatus] = useState('Compass not enabled');
  const [running, setRunning] = useState(false);
  const [lastEvent, setLastEvent] = useState<number | null>(null);
  const heading = useRef<number | null>(null);
  const started = useRef(false);
  const lastDelivered = useRef(0);
  const preferredIos = useRef(0);
  const [tick, setTick] = useState(Date.now());

  const onEvent = useCallback((event: DeviceOrientationEvent) => {
    const e = event as OrientationEventWithCompass;
    const screenAngle = screen.orientation?.angle ?? 0;
    const raw = parseOrientation(e, screenAngle, Date.now());
    if (!raw) return;
    // Don't accidentally switch to noisy alpha events if iOS has provided a real magnetic heading.
    if (raw.source === 'ios-magnetic') preferredIos.current = Date.now();
    if (raw.source !== 'ios-magnetic' && Date.now() - preferredIos.current < 2500) return;
    heading.current = smoothHeading(heading.current, raw.heading);
    const now = Date.now();
    if (now - lastDelivered.current < 45) return;
    lastDelivered.current = now;
    setSample({ ...raw, heading: heading.current });
    setLastEvent(now);
    setStatus('Receiving orientation data');
  }, []);

  const stop = useCallback(() => {
    window.removeEventListener('deviceorientationabsolute', onEvent);
    window.removeEventListener('deviceorientation', onEvent);
    started.current = false;
    setRunning(false);
    setSample(null);
  }, [onEvent]);

  const start = useCallback(async () => {
    if (started.current) return;
    if (!window.isSecureContext) { setStatus('HTTPS is required for sensors.'); return; }
    if (!('DeviceOrientationEvent' in window)) { setStatus('No device orientation API. Use map or solar mode.'); return; }
    const permissionApi = DeviceOrientationEvent as unknown as OrientationPermissionConstructor;
    if (typeof permissionApi.requestPermission === 'function') {
      try {
        // Must be requested directly in response to a user click, especially on iOS.
        const result = await permissionApi.requestPermission(true);
        if (result !== 'granted') { setStatus('Compass permission denied.'); return; }
      } catch { setStatus('Compass permission failed. Check browser settings.'); return; }
    }
    heading.current = null;
    preferredIos.current = 0;
    started.current = true;
    window.addEventListener('deviceorientationabsolute', onEvent);
    window.addEventListener('deviceorientation', onEvent);
    setRunning(true);
    setStatus('Waiting for absolute heading. Hold phone flat in portrait.');
  }, [onEvent]);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => { window.clearInterval(id); window.removeEventListener('deviceorientationabsolute', onEvent); window.removeEventListener('deviceorientation', onEvent); };
  }, [onEvent]);

  const fresh = sample != null && lastEvent != null && tick - lastEvent < 4000;
  return {
    sample: fresh ? sample : null,
    status: running && !fresh && lastEvent != null ? 'Heading stale. Move the phone or use solar/map mode.' : status,
    running, start, stop,
  };
}
