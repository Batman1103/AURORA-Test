import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, CloudSnow, Globe2, Menu, Moon, Radio, Sun, Wind } from 'lucide-react';
import StatusPill from '../common/StatusPill';

export default function Topbar({ station, setStation, menuOpen, setMenuOpen, dashboard, alerts = [] }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();

  const temp = dashboard?.temperatureC != null
    ? `${dashboard.temperatureC > 0 ? '+' : ''}${dashboard.temperatureC}°C`
    : '−18.6°C';

  const windSpeed = dashboard?.windSpeedMs != null ? `${dashboard.windSpeedMs} m/s` : '12.4 m/s';
  const isBlizzard = dashboard?.scenario === 'blizzard';
  const isSunlit = (dashboard?.solarKw ?? 0) > 10;
  const weatherLabel = dashboard?.weatherCondition || (isBlizzard ? 'Blizzard' : (isSunlit ? 'Clear sky' : 'Polar night'));
  const WeatherIcon = isBlizzard ? CloudSnow : (isSunlit ? Sun : Moon);

  const mode = (dashboard?.scenario && dashboard.scenario !== 'normal')
    ? dashboard.scenario.replace('_', ' ').toUpperCase()
    : (dashboard?.mode ? dashboard.mode.toUpperCase() : 'NORMAL');

  const modeTone = (isBlizzard || mode.includes('CONSERV') || mode.includes('EMERG'))
    ? (mode.includes('EMERG') ? 'danger' : 'warning')
    : 'success';

  return (
    <header className="topbar">
      <div className="brand-block">
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">
          <Menu size={19} />
        </button>
        <div className="brand-mark">
          <span className="brand-glyph">A</span>
        </div>
        <div>
          <div className="brand-name">AURORA</div>
          <div className="brand-sub">AI ENERGY INTELLIGENCE</div>
        </div>
      </div>

      <div className="station-selector">
        <div className="station-icon">
          <Globe2 size={17} />
        </div>
        <select value={station} onChange={(e) => setStation(e.target.value)} aria-label="Research station">
          <option>Bharati Station</option>
          <option>Maitri Station</option>

        </select>
        <ChevronDown size={15} className="select-chevron" />
      </div>

      <div className="top-actions">
        <StatusPill icon={<Radio size={15} />} label="SYSTEM" value={mode} tone={modeTone} />

        <div className="weather-pill" title={`Antarctic telemetry: ${temp}, Wind: ${windSpeed}`}>
          <div className="weather-icon">
            <WeatherIcon size={18} />
          </div>
          <div>
            <div className="weather-temp">{temp}</div>
            <div className="weather-copy">{weatherLabel} · {windSpeed}</div>
          </div>
        </div>

        <div className="top-time" title="Station Master Clock (Live Real-Time)">
          <div>{formattedTime}</div>
          <span>{formattedDate}</span>
        </div>

        <button className="icon-btn notification" title={`${alerts.length} active station events`}>
          <Bell size={18} />
          {alerts.length > 0 && <span className="dot" />}
        </button>
        <button className="avatar" title="Operator Profile">AR</button>
      </div>
    </header>
  );
}
