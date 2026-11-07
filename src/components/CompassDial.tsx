import { Navigation2 } from 'lucide-react';
import { normalize, signedTurn } from '../lib/geo';

export function CompassDial({ bearing, heading, verified }: {
  bearing: number;
  heading: number | null;
  verified: boolean;
}) {
  const relative = heading == null ? bearing : signedTurn(bearing, heading);
  const north = heading == null ? 0 : -normalize(heading);
  return (
    <div className="compass-wrap" role="img" aria-label={heading == null ? `North-up Qibla bearing ${bearing.toFixed(1)} degrees` : `Qibla ${Math.abs(relative).toFixed(1)} degrees ${relative >= 0 ? 'clockwise' : 'anticlockwise'} from phone top edge`}>
      <div className="compass-glow" />
      <div className="compass-shell">
        <div className="compass-ticks" style={{ transform: `rotate(${north}deg)` }}>
          {Array.from({ length: 72 }, (_, i) => <i key={i} className={i % 9 === 0 ? 'major' : i % 3 === 0 ? 'medium' : ''} style={{ transform: `rotate(${i * 5}deg)` }} />)}
          <span className="compass-cardinal north">N</span>
          <span className="compass-cardinal east">E</span>
          <span className="compass-cardinal south">S</span>
          <span className="compass-cardinal west">W</span>
        </div>
        <div className="compass-qibla" style={{ transform: `rotate(${relative}deg)` }}>
          <div className="qibla-tip"><Navigation2 size={23} fill="currentColor" strokeWidth={1.5} /></div>
          <div className="qibla-needle" />
          <div className="qibla-rear" />
        </div>
        <div className="compass-axis"><span className="axis-dot" /></div>
        <div className="compass-top-marker" />
      </div>
      <div className={`dial-tag ${verified ? 'verified' : ''}`}>
        {heading == null ? 'NORTH-UP REFERENCE' : verified ? 'SOLAR-CALIBRATED' : 'LIVE SENSOR HEADING'}
      </div>
    </div>
  );
}
