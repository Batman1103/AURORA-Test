import React from 'react';
export default function FuelGauge({ fuelLitres = 218400, capacityLitres = 350000 }) {
  const pct = Math.max(0, Math.min(100, (fuelLitres / capacityLitres) * 100));
  return <div className="fuel-gauge"><div className="gauge-arc"><div className="gauge-fill" style={{ width: `${pct}%` }}/></div><div className="gauge-center"><span>REMAINING</span><strong>{Math.round(fuelLitres).toLocaleString()}</strong><b>L</b></div><div className="gauge-range"><span>E</span><span>F</span></div></div>; }
