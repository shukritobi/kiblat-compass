import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowDownRight, ArrowRight, CheckCircle2, Compass, Crosshair, ExternalLink, Eye, Info, LocateFixed, MapPinned, Moon, Navigation2, RotateCcw, ShieldAlert, Smartphone, Sun, Target, WifiOff, X } from 'lucide-react';
import { CompassDial } from './components/CompassDial';
import { MapView } from './components/MapView';
import { useCompass } from './hooks/useCompass';
import { useLocation } from './hooks/useLocation';
import { cardinal, initialBearing, normalize, signedTurn, wgs84Bearing } from './lib/geo';
import { acceptableTilt } from './lib/heading';
import { magneticDeclination, magneticToTrue } from './lib/magnetism';
import { solarReference } from './lib/solar';
import './styles.css';

type Tab = 'compass' | 'solar' | 'map';
type Calibration = { correction: number; expires: number; latitude: number; longitude: number };
const MAP_TABS: { key: Tab; name: string; icon: typeof Compass }[] = [
  { key: 'compass', name: 'Compass', icon: Compass },
  { key: 'solar', name: 'Solar verify', icon: Sun },
  { key: 'map', name: 'Map view', icon: MapPinned },
];
const formatAngle = (angle: number) => `${angle.toFixed(1)}°`;

export default function App() {
  const [tab, setTab] = useState<Tab>('compass');
  const { location, loading: locating, start: locate, manuallySet } = useLocation();
  const compass = useCompass();
  const [now, setNow] = useState(() => new Date());
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [manualError, setManualError] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => { window.clearInterval(id); window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, []);

  const bearing = useMemo(() => initialBearing(location.coords), [location.coords]);
  const ellipsoid = useMemo(() => wgs84Bearing(location.coords), [location.coords]);
  const declination = useMemo(() => {
    try { return magneticDeclination(location.coords, location.altitudeMeters, now); }
    catch { return null; }
  // WMM evolves slowly; recompute with location/date rather than every tick.
  }, [location.coords, location.altitudeMeters, now.getUTCFullYear(), now.getUTCMonth()]);
  const solar = useMemo(() => solarReference(location.coords, bearing, now), [location.coords, bearing, now]);
  const rawSample = compass.sample;
  const tiltOk = rawSample ? acceptableTilt(rawSample.beta, rawSample.gamma) : false;
  const headingTrue = rawSample && (rawSample.source !== 'ios-magnetic' || declination != null)
    ? rawSample.source === 'ios-magnetic' ? magneticToTrue(rawSample.heading, declination!) : rawSample.heading
    : null;
  const calibrated = calibration != null && calibration.expires > now.getTime()
    && Math.hypot(calibration.latitude - location.coords.latitude, calibration.longitude - location.coords.longitude) < 0.001;
  const heading = headingTrue != null ? normalize(headingTrue + (calibrated ? calibration!.correction : 0)) : null;
  const canAlign = heading != null && tiltOk;
  const turn = heading != null ? signedTurn(bearing, heading) : null;
  const estimatedAccuracy = rawSample?.accuracy ?? null;
  const sensorWarning = !compass.running ? 'Enable compass to receive device heading.'
    : !rawSample ? compass.status
    : !tiltOk ? 'Place the phone flat and keep it in portrait.'
    : estimatedAccuracy != null && estimatedAccuracy > 15 ? 'Poor compass calibration. Move away from metal and try a figure-eight motion.'
    : 'Magnetic interference is possible. Verify with shadow or mapped landmarks.';
  const confidence = !canAlign ? 'Awaiting valid sensor' : estimatedAccuracy != null && estimatedAccuracy > 15 ? 'Low sensor confidence'
    : calibrated ? 'Solar reference applied' : 'Unverified magnetic heading';

  const calibrateFromShadow = () => {
    if (!solar.usable || headingTrue == null || !tiltOk || location.mode === 'demo') return;
    setCalibration({ correction: signedTurn(solar.shadowBearing, headingTrue), expires: Date.now() + 15 * 60_000,
      latitude: location.coords.latitude, longitude: location.coords.longitude });
  };

  const applyManual = (event: FormEvent) => {
    event.preventDefault();
    const lat = Number(latitude), lng = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setManualError('Enter valid latitude (-90 to 90) and longitude (-180 to 180).'); return;
    }
    manuallySet({ latitude: lat, longitude: lng });
    setCalibration(null);
    setShowManual(false);
    setManualError('');
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="QiblaVector home">
          <span className="brand-mark"><Navigation2 size={21} fill="currentColor" strokeWidth={1.7} /></span>
          <span>QIBLA<span className="brand-mid">/</span>VECTOR <small>PRECISION DIRECTION</small></span>
        </a>
        <div className="header-actions">
          <span className="header-live"><span className="live-dot" /> PRIVACY-FIRST · ON DEVICE</span>
          <button type="button" className="circle-button" aria-label="Information" onClick={() => setShowAbout(true)}><Info size={19}/></button>
        </div>
      </header>

      <main className="page-main">
        <section className="intro">
          <div><p className="eyebrow"><span className="eyebrow-line"/> THE DIRECTION THAT MATTERS</p>
            <h1>Find your <em>direction.</em></h1>
            <p className="intro-copy">A more thoughtful way to find Qibla. Grounded in real geographic calculations, calibrated sensors, and the position of the sun.</p>
          </div>
          <div className="intro-side"><span className="intro-index">01 / 03</span><span>MAKKAH, SAUDI ARABIA<br/>21.4225° N · 39.8262° E</span></div>
        </section>

        <div className="workspace">
          <section className="main-panel" aria-label="Qibla navigation">
            <div className="tabs" role="tablist" aria-label="Direction modes">
              {MAP_TABS.map(({key,name,icon: Icon}) => <button key={key} type="button" role="tab" aria-selected={tab===key} className={`tab ${tab===key?'active':''}`} onClick={()=>setTab(key)}><Icon size={17}/>{name}</button>)}
            </div>

            {tab === 'compass' && <>
              <div className="mode-title"><div><p className="overline">LIVE QIBLA COMPASS</p><h2>Follow the needle</h2></div><span className="mode-icon"><Crosshair size={21}/></span></div>
              <div className="bearing-summary"><span className="bearing-number">{formatAngle(bearing)}</span><span className="bearing-descriptor">QIBLA BEARING<br/>FROM TRUE NORTH</span></div>
              <CompassDial bearing={bearing} heading={canAlign ? heading : null} verified={!!calibrated} />
              <div className="direction-readout">
                <div className="turn-icon"><Navigation2 size={21}/></div>
                <div className="turn-details"><b>{turn == null || !tiltOk ? 'North-up reference only' : Math.abs(turn) < 2 ? 'Facing Qibla direction' : `Turn ${Math.abs(turn).toFixed(1)}° ${turn > 0 ? 'clockwise' : 'counterclockwise'}`}</b>
                  <span>{!canAlign ? 'Enable compass, then hold your phone flat.' : 'Direction measured from the top edge of your phone.'}</span></div>
                {canAlign && Math.abs(turn!) < 2 && <CheckCircle2 size={24} className="success-text"/>}
              </div>
              <div className="main-panel-actions"><button type="button" className="primary-button" onClick={compass.running ? compass.stop : compass.start}>{compass.running ? <RotateCcw size={18}/> : <Smartphone size={18}/>} {compass.running ? 'Stop live compass' : 'Enable live compass'} <ArrowRight size={17}/></button></div>
              <div className="inline-note"><ShieldAlert size={17}/><span>{sensorWarning}</span></div>
            </>}

            {tab === 'solar' && <>
              <div className="mode-title"><div><p className="overline">INDEPENDENT SUN REFERENCE</p><h2>Verify with sunlight</h2></div><span className="mode-icon"><Sun size={22}/></span></div>
              <div className="solar-hero"><Sun size={37}/><div><span>Current sun azimuth</span><b>{formatAngle(solar.azimuth)}</b><small>Clockwise from true north</small></div><div className="solar-hero-alt"><span>ALTITUDE</span><strong>{formatAngle(solar.altitude)}</strong></div></div>
              <div className="solar-two"><div><p>SHADOW BEARING</p><b>{formatAngle(solar.shadowBearing)}</b><small>Direction the shadow points</small></div><div><p>SHADOW TO QIBLA</p><b>{Math.abs(solar.turnFromShadow).toFixed(1)}° <small>{solar.turnFromShadow>=0?'CW':'CCW'}</small></b><small>Rotate from shadow toward Qibla</small></div></div>
              <div className="steps"><h3>Physical shadow alignment</h3><div><span>01</span><p>Outdoors, place a straight vertical stick on level ground in unobstructed sunlight.</p></div><div><span>02</span><p>Identify the shadow line extending <strong>away from the stick</strong>. This is the displayed shadow bearing.</p></div><div><span>03</span><p>Rotate clockwise (CW) or counterclockwise (CCW) by the displayed angle to face Qibla.</p></div><div><span>04</span><p>Optional: align your flat phone's <strong>top edge away from the stick, along the shadow</strong>, then tap Calibrate to correct the live compass temporarily.</p></div></div>
              <div className={`inline-note ${solar.usable?'note-good':''}`}>{solar.usable?<CheckCircle2 size={17}/>:<ShieldAlert size={17}/>}<span>{!solar.usable ? 'Sun is too low, below horizon or near overhead. This shadow method is not suitable now.' : location.mode==='demo' ? 'Demo coordinates active. Enable GPS or enter a real location before calibration.' : 'Solar shadow geometry is usable now if you have a straight, clearly visible shadow.'}</span></div>
              <button type="button" className="primary-button full" disabled={!solar.usable || !canAlign || location.mode==='demo'} onClick={calibrateFromShadow}><Sun size={18}/> {calibrated ? 'Update solar calibration' : 'Calibrate from aligned shadow'} <ArrowRight size={17}/></button>
              <p className="small-disclaimer">This action assumes you have <strong>physically aligned</strong> the phone with the observed shadow. It cannot verify the alignment itself. Calibration expires after 15 minutes or a location change. Never use a photographed shadow or point your eyes at the sun.</p>
            </>}

            {tab === 'map' && <>
              <div className="mode-title"><div><p className="overline">NORTH-UP MAP REFERENCE</p><h2>Check the surroundings</h2></div><span className="mode-icon"><MapPinned size={21}/></span></div>
              <MapView position={location.coords} bearing={bearing} demo={location.mode==='demo'} />
              <div className="inline-note"><Info size={17}/><span>Match the teal line against a real, identifiable road or building edge. Satellite imagery is not a surveyed reference and is unavailable offline.</span></div>
            </>}
          </section>

          <aside className="side-panel">
            <section className="info-card location-card"><div className="card-heading"><div className="card-kicker"><LocateFixed size={16}/> YOUR LOCATION</div><span className={`status-label ${location.mode==='gps'?'is-good':''}`}><i/>{location.mode==='gps'?'GPS LIVE':location.mode==='manual'?'MANUAL':'DEMO'}</span></div>
              <h3>{location.mode==='demo'?'Kuala Lumpur, Malaysia':location.mode==='manual'?'Custom coordinates':'Current GPS position'}</h3>
              <p className="coords">{location.coords.latitude.toFixed(5)}° N · {location.coords.longitude.toFixed(5)}° E</p>
              <div className="location-actions"><button type="button" onClick={()=>{setCalibration(null);locate();}} className="small-button"><LocateFixed size={15}/>{locating?'Locating…':'Use my GPS'}</button><button type="button" onClick={()=>setShowManual(v=>!v)} className="text-button">Enter coordinates <ArrowRight size={14}/></button></div>
              {showManual && <form className="manual-form" onSubmit={applyManual}><label>Latitude<input type="number" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} placeholder="e.g. 3.1390" required/></label><label>Longitude<input type="number" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} placeholder="e.g. 101.6869" required/></label>{manualError&&<p className="form-error">{manualError}</p>}<button className="small-button" type="submit">Apply location</button></form>}
              <div className="card-bottom"><span>{location.status}</span>{location.accuracyMeters!=null&&<b>±{Math.round(location.accuracyMeters)} m GPS</b>}</div></section>

            <section className="info-card readings-card"><div className="card-heading"><div className="card-kicker"><Activity size={16}/> SENSOR READINGS</div><span className="muted-tiny">REAL-TIME</span></div>
              <div className="reading"><span>Phone heading (true)</span><b>{heading==null?'—':formatAngle(heading)}</b></div>
              <div className="reading"><span>Magnetic declination</span><b>{declination==null?'—':`${declination>=0?'+':''}${declination.toFixed(2)}°`}</b></div>
              <div className="reading"><span>Qibla cardinal</span><b>{cardinal(bearing)}</b></div>
              <div className="reading"><span>WGS84 cross-check</span><b>{ellipsoid==null?'—':formatAngle(ellipsoid)}</b></div>
              <div className="reading"><span>Sensor error reported</span><b>{estimatedAccuracy==null?'Not exposed':`±${estimatedAccuracy.toFixed(0)}°`}</b></div>
              <div className="reading"><span>Sensor source</span><b className="source-reading">{rawSample?.source==='ios-magnetic'?'iOS magnetic':rawSample?.source==='absolute-rotation'?'Absolute orientation':'Not connected'}</b></div>
              <div className="confidence"><div className="confidence-header"><Eye size={16}/><b>READING STATUS</b></div><p>{confidence}</p><small>Accuracy cannot be guaranteed without independent physical verification.</small></div></section>

            <section className="info-card philosophy-card"><div className="philosophy-symbol"><Target size={25}/></div><p className="card-kicker">PRECISION BY DESIGN</p><h3>Not just another compass.</h3><p>QiblaVector separates the math from the phone's heading. If sensors are uncertain, we show that rather than invent a precise result.</p><button type="button" onClick={()=>setShowAbout(true)}>Our methodology <ArrowRight size={16}/></button></section>
          </aside>
        </div>
        <div className="under-panel"><div><span className="under-icon"><CheckCircle2 size={18}/></span><span><b>Computed on your device</b><small>No location sent to our servers</small></span></div><div><span className="under-icon"><Moon size={18}/></span><span><b>Works after installation</b><small>Compass and solar logic available offline</small></span></div><div><span className="under-icon">{online?<Target size={18}/>:<WifiOff size={18}/>}</span><span><b>{online?'No login required':'You are offline'}</b><small>{online?'Free & open source':'Map imagery requires a connection'}</small></span></div></div>
      </main>
      <footer><span>QIBLA / VECTOR <span className="footer-tint">© {now.getFullYear()}</span></span><span>BUILT FOR CLARITY · TESTED IN CODE, VERIFY IN THE FIELD</span><a href="https://github.com/shukritobi/kiblat-compass" target="_blank" rel="noopener noreferrer">SOURCE CODE <ExternalLink size={14}/></a></footer>

      {showAbout && <div className="modal-backdrop" onClick={()=>setShowAbout(false)} role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-label="Accuracy and methodology" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAbout(false)} aria-label="Close"><X size={21}/></button><p className="overline">METHODOLOGY</p><h2>What makes a direction trustworthy?</h2><p>QiblaVector calculates the conventional great-circle bearing from the selected coordinates to a fixed Kaaba reference. It additionally displays an independently computed WGS84 ellipsoidal bearing for comparison. These mathematical models differ slightly.</p><p>On iOS Safari, the native <code>webkitCompassHeading</code> is a <strong>magnetic</strong> heading and is corrected using the WMM2025 declination model. On supported Android browsers, an absolute device-orientation heading is used directly without applying declination twice. Relative-only heading events are rejected.</p><p>Phone heading cannot be regarded as a measured precision instrument. Local metal, magnetic cases, the wrong tilt, browser inconsistencies and sensor calibration all produce errors. Solar shadow alignment provides a physically separate directional reference when usable.</p><p>For this reason, we do not certify exact heading accuracy or mark device-only readings as verified. All GPS and heading processing occurs locally. Satellite map tiles are requested from their providers.</p><div className="modal-links"><a href="https://github.com/shukritobi/kiblat-compass#methodology" target="_blank" rel="noopener noreferrer">Technical documentation <ArrowDownRight size={16}/></a><button onClick={()=>{setShowAbout(false);setTab('solar');}}>Try solar verification <ArrowRight size={16}/></button></div></div></div>}
    </div>
  );
}
