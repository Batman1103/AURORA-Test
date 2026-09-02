import React from 'react';
import { BatteryCharging, ShieldCheck } from 'lucide-react';
import PanelHeader from '../common/PanelHeader';
export default function BatteryPanel({ soc = 72, minReservePct = 25 }){
  const rounded = Math.round(soc);
  return <div className="panel battery-summary"><PanelHeader title="BATTERY HEALTH" subtitle="Station storage bank" icon={<BatteryCharging size={16}/>}/><div className="battery-percent">{rounded}<span>%</span></div><div className="battery-bar"><span style={{width:`${rounded}%`}}/></div><div className="battery-stats"><div><span>Voltage</span><strong>742 V</strong></div><div><span>Current</span><strong>−64 A</strong></div><div><span>Temp</span><strong>−12.4°C</strong></div><div><span>Health</span><strong>94%</strong></div></div><div className="battery-rule"><ShieldCheck size={15}/> Reserve floor protected at {minReservePct}% SOC.</div></div>;
}
