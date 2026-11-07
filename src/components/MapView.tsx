import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { destination, greatCirclePoints, KAABA } from '../lib/geo';
import type { Coordinates } from '../lib/geo';

export function MapView({ position, bearing, demo }: { position: Coordinates; bearing: number; demo: boolean }) {
  const mount = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const lines = useRef<L.LayerGroup | null>(null);
  const tile = useRef<L.TileLayer | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [wholePath, setWholePath] = useState(false);

  useEffect(() => {
    if (!mount.current || map.current) return;
    const instance = L.map(mount.current, { zoomControl: false, attributionControl: true })
      .setView([position.latitude, position.longitude], 16);
    map.current = instance;
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    lines.current = L.layerGroup().addTo(instance);
    return () => { instance.remove(); map.current = null; lines.current = null; tile.current = null; };
  // Mount once, before subsequent location updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (tile.current) map.current.removeLayer(tile.current);
    const url = satellite
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = satellite
      ? 'Imagery © Esri and its data providers'
      : '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
    tile.current = L.tileLayer(url, { maxZoom: satellite ? 19 : 19, attribution, crossOrigin: true }).addTo(map.current);
  }, [satellite]);

  useEffect(() => {
    const m = map.current;
    const group = lines.current;
    if (!m || !group) return;
    group.clearLayers();
    const start = L.latLng(position.latitude, position.longitude);
    L.circleMarker(start, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#32b99a', fillOpacity: 1 })
      .bindPopup(demo ? 'Demo point: Kuala Lumpur (not GPS)' : 'Your selected position').addTo(group);
    const near = destination(position, bearing, 2200);
    L.polyline([[position.latitude, position.longitude], [near.latitude, near.longitude]], {
      color: '#40d4ae', weight: 5, opacity: .96,
    }).addTo(group);
    L.circleMarker([near.latitude, near.longitude], { radius: 5, color: '#40d4ae', fillColor: '#40d4ae', fillOpacity: 1 })
      .bindTooltip('Qibla bearing').addTo(group);
    if (wholePath) {
      const route = greatCirclePoints(position);
      const positions = route.map(p => L.latLng(p.latitude, p.longitude));
      L.polyline(positions, { color: '#eabf73', weight: 3, opacity: .85, dashArray: '8 7' }).addTo(group);
      L.circleMarker([KAABA.latitude, KAABA.longitude], { radius: 8, color: '#eabf73', fillColor: '#eabf73', fillOpacity: 1 })
        .bindTooltip('Kaaba, Makkah').addTo(group);
      m.fitBounds(L.latLngBounds(positions), { padding: [32, 32] });
    } else {
      m.setView(start, 16);
    }
    window.setTimeout(() => m.invalidateSize(), 100);
  }, [position.latitude, position.longitude, bearing, wholePath, demo]);

  return (
    <div className="map-panel">
      <div className="map-controls" role="group" aria-label="Map options">
        <button className={!satellite ? 'selected' : ''} onClick={() => setSatellite(false)}>Street</button>
        <button className={satellite ? 'selected' : ''} onClick={() => setSatellite(true)}>Satellite</button>
        <button className="map-route" onClick={() => setWholePath(v => !v)}>{wholePath ? 'Local view' : 'Full path'}</button>
      </div>
      <div ref={mount} className="leaflet-map" aria-label="Qibla line on north-up map" />
      <p className="map-footnote">North-up map. The teal line gives the local Qibla bearing; the dashed gold line shows the great-circle path to Makkah. Tiles require internet.</p>
    </div>
  );
}
