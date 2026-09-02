import React, { useEffect, useState } from 'react';
import { Activity, ArrowDown, BarChart, BatteryCharging, Bell, BrainCircuit, CloudSun, Database, Download, Gauge, GitBranch, Leaf, LineChart, Server, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Sun, ThermometerSnowflake, TrendingDown, Wind, Zap } from 'lucide-react';
import PanelHeader from '../components/common/PanelHeader';
import SimpleModuleCard from '../components/common/SimpleModuleCard';
import AlertCard from '../components/common/AlertCard';
import { DispatchBars, EnergyMixChart, FuelRiskChart, LoadForecastChart, RenewableChart, BatteryChart } from '../components/charts/Charts';
import FuelGauge from '../components/energy/FuelGauge';
import BatteryPanel from '../components/energy/BatteryPanel';
import { api } from '../services/api';

// Shared hook: fetch a station-scoped API resource on mount, refresh every 15s.
function useLiveResource(fetcher, station = 'bharati') {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetcher(station);
        if (!cancelled) setData(result);
      } catch (err) {
        // Leave previous/default data in place on transient API errors.
        console.warn('AURORA live resource fetch failed:', err.message);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [fetcher, station]);
  return data;
}

const Timeline = () => { const items=[['10:15','Fuel alert raised','warning'],['09:45','Optimization completed','success'],['09:12','Wind forecast updated','info'],['08:52','Generator 2 maintenance scheduled','neutral'],['08:30','Battery reserve recalculated','success']]; return <div className="timeline">{items.map(([time,title,kind])=><div className="timeline-row" key={time+title}><span className="timeline-time">{time}</span><i className={`timeline-dot ${kind}`}/><div><strong>{title}</strong><span>Automated station event</span></div></div>)}</div>; };

export function LiveMonitor({dashboard}){
  const load = dashboard?.loadKw ?? 187;
  const thermal = dashboard?.thermalKw ?? 112;
  return <><div className="big-monitor"><div className="monitor-number">{Math.round(load)}<span> kW</span></div><div className="monitor-label">Station instantaneous load</div><div className="monitor-bars">{Array.from({length:28}).map((_,i)=><i key={i} style={{height:`${28+((i*17)%53)}%`}}/>)}</div></div><div className="module-grid"><SimpleModuleCard icon={<Activity/>} title="Demand profile" value={`${load.toFixed(0)} kW`} note={dashboard ? 'Live station load' : '−4.8% vs forecast'}/><SimpleModuleCard icon={<Zap/>} title="Power quality" value="99.97%" note="Stable frequency"/><SimpleModuleCard icon={<ThermometerSnowflake/>} title="Thermal demand" value={`${thermal.toFixed(0)} kWth`} note="Heating dominant"/></div></>;
}
export function EnergyFlowPage({EnergyFlow, dashboard}){
  const solar = dashboard?.solarKw ?? 42;
  const wind = dashboard?.windKw ?? 61;
  const load = dashboard?.loadKw ?? 187;
  const diesel = Math.max(0, load - solar - wind);
  const total = Math.max(1e-6, solar + wind + diesel);
  return <><div className="panel full-panel"><PanelHeader title="LIVE ENERGY FLOW MAP" subtitle="Generation → storage → loads" icon={<GitBranch size={16}/>}/><EnergyFlow dashboard={dashboard}/></div><div className="module-grid"><SimpleModuleCard icon={<Sun/>} title="Solar" value={`${solar.toFixed(0)} kW`} note={`${((solar/total)*100).toFixed(0)}% of live generation`}/><SimpleModuleCard icon={<Wind/>} title="Wind" value={`${wind.toFixed(0)} kW`} note={`${((wind/total)*100).toFixed(0)}% of live generation`}/><SimpleModuleCard icon={<Server/>} title="Diesel / CHP" value={`${diesel.toFixed(0)} kW`} note={`${((diesel/total)*100).toFixed(0)}% of live generation`}/></div></>;
}
export function Forecasting({forecasts, dashboard}){ const loadPoints = forecasts?.load?.points?.map(p=>({t:new Date(p.timestamp).getHours().toString().padStart(2,'0'), forecast:p.value_kw, actual:null})) || undefined; const renewPoints = forecasts?.renewable?.points?.map(p=>({t:new Date(p.timestamp).getHours().toString().padStart(2,'0'), value:p.solar_kw})) || undefined; return <><div className="two-col"><div className="panel"><PanelHeader title="AI LOAD FORECAST" subtitle="24h rolling prediction" icon={<BrainCircuit size={16}/>}/><LoadForecastChart data={loadPoints}/></div><div className="panel"><PanelHeader title="RENEWABLE FORECAST" subtitle="Solar / wind" icon={<CloudSun size={16}/>}/><RenewableChart mode="Solar" data={renewPoints}/></div></div><div className="module-grid"><SimpleModuleCard icon={<Sparkles/>} title="Model confidence" value={`${(((forecasts?.load?.metrics?.r2 ?? 0.713) * 100)).toFixed(1)}%`} note="R²-based model score"/><SimpleModuleCard icon={<TrendingDown/>} title="Forecast MAE" value={`${Number(forecasts?.load?.metrics?.mae_kw ?? 16.12).toFixed(2)} kW`} note="Current development MAE"/><SimpleModuleCard icon={<Database/>} title="Data quality" value="99.1%" note="No critical gaps"/></div></>}
export function Optimization({runOptimization, optimizationResult}){
  const engineLabel = optimizationResult?.engine === 'milp' ? 'OR-Tools MILP solver' : optimizationResult?.engine === 'rule_based_fallback' ? 'Rule-based fallback (MILP unavailable)' : 'Not yet run';
  return <><div className="optimization-command panel"><PanelHeader title="OPTIMIZATION COMMAND" subtitle="Mixed-integer dispatch engine" icon={<BrainCircuit size={16}/>}/><div className="optimizer-command-grid"><div className="optimizer-card"><span>Objective</span><strong>Minimize fuel + curtailment</strong><small>Critical-load reliability enforced</small></div><div className="optimizer-card"><span>Active horizon</span><strong>{optimizationResult?.horizon_hours ? `${optimizationResult.horizon_hours} hours` : '24 hours'}</strong><small>Hourly receding horizon</small></div><div className="optimizer-card"><span>Engine used</span><strong>{engineLabel}</strong><small>{optimizationResult ? `Fuel saved: ${Number(optimizationResult.fuel_saved_litres ?? 0).toFixed(1)} L` : 'Battery · CHP · generators · reserve'}</small></div></div><button className="primary-btn large-btn" onClick={runOptimization}><Sparkles size={16}/> Run AURORA optimization</button></div><div className="panel"><PanelHeader title="DISPATCH RECOMMENDATION" subtitle="Next 6 hours" icon={<SlidersHorizontal size={16}/>}/><DispatchBars/></div></>;
}
export function FuelManagement({station}){
  const fuel = useLiveResource(api.getFuelStatus, station);
  const fuelLitres = fuel?.fuelLitres ?? 218400;
  const capacityLitres = fuel?.capacityLitres ?? 350000;
  const days = fuel?.daysToExhaustion ?? 174;
  const reserve = fuel?.reserveLitres ?? 30000;
  return <><div className="two-col"><div className="panel"><PanelHeader title="FUEL RESILIENCE" subtitle="Forecast vs reserve" icon={<Gauge size={16}/>}/><FuelGauge fuelLitres={fuelLitres} capacityLitres={capacityLitres}/><div className="fuel-large"><strong>{Math.round(days)} days</strong><span>to projected exhaustion</span></div></div><div className="panel"><PanelHeader title="FUEL RISK CURVE" subtitle="180-day projection" icon={<TrendingDown size={16}/>}/><FuelRiskChart/></div></div><div className="module-grid"><SimpleModuleCard icon={<ArrowDown/>} title="Daily consumption" value={`${Math.round(fuel?.dailyConsumptionLitres ?? 1250).toLocaleString()} L`} note={fuel ? 'Live station estimate' : '−6.8% vs baseline'}/><SimpleModuleCard icon={<ShieldCheck/>} title="Reserve buffer" value={`${Math.round(reserve).toLocaleString()} L`} note={`Risk: ${fuel?.risk ?? 'LOW'}`}/><SimpleModuleCard icon={<Leaf/>} title="Fuel-linked CO₂" value="3.18 t" note="Today · avoided 0.48 t"/></div></>;
}
export function BatteryManagement({station}){
  const battery = useLiveResource(api.getBatteryStatus, station);
  return <div className="two-col"><BatteryPanel soc={battery?.soc ?? 72} minReservePct={battery?.minReservePct ?? 25}/><div className="panel"><PanelHeader title="BATTERY DISPATCH" subtitle="State of charge trajectory" icon={<BatteryCharging size={16}/>}/><BatteryChart/></div></div>;
}
export function Reports(){return <><div className="module-grid four"><SimpleModuleCard icon={<TrendingDown/>} title="Fuel saved this month" value="8.7 kL" note="vs conventional dispatch"/><SimpleModuleCard icon={<Leaf/>} title="Renewable utilization" value="41%" note="+18% vs baseline"/><SimpleModuleCard icon={<ShieldCheck/>} title="Critical uptime" value="99.98%" note="Last 30 days"/><SimpleModuleCard icon={<Download/>} title="Reports ready" value="12" note="PDF + CSV exports"/></div><div className="panel"><PanelHeader title="MONTHLY ENERGY MIX" subtitle="Baseline vs AURORA" icon={<BarChart size={16}/>}/><EnergyMixChart/></div></>}
export function Alerts({setToast, station}){
  const alertsResponse = useLiveResource(api.getAlerts, station);
  const alerts = alertsResponse?.alerts ?? [
    {id:'fuel-efficiency', severity:'warning', title:'High fuel consumption', body:'GEN 1 running outside optimal efficiency band.', timestamp:'10:15', action:'Recommended action: transfer 18 kW to wind + battery.'},
    {id:'polar-night', severity:'info', title:'Polar night approaching', body:'Solar contribution expected to fall over the next 35 days.', timestamp:'09:40', action:'Fuel reserve remains within target under current forecast.'},
  ];
  return <div className="two-col"><div className="panel"><PanelHeader title="ACTIVE EVENTS" subtitle="Priority ordered" icon={<Bell size={16}/>}/>{alerts.map(a=>
    <AlertCard key={a.id} severity={a.severity} title={a.title} body={a.body} time={a.timestamp} onClick={()=>setToast({type:a.severity,text:a.action})}/>
  )}</div><div className="panel"><PanelHeader title="EVENT TIMELINE" subtitle="Latest station activity" icon={<Bell size={16}/>}/><Timeline/></div></div>;
}
export function SettingsPage({setToast}){const rows=[['Critical load protection','Enabled','success'],['Fuel conservation trigger','30,000 L','info'],['Forecast update cadence','15 min','info'],['Operator override','Simulation only','warning']];return <div className="panel settings-panel"><PanelHeader title="AURORA CONFIGURATION" subtitle="Station policies and model controls" icon={<Settings size={16}/>}/><div className="settings-grid">{rows.map(([label,value,type])=><button className="setting-row" key={label} onClick={()=>setToast({type,text:`${label}: ${value}`})}><span>{label}</span><b>{value}</b><span>↗</span></button>)}</div></div>}
export function HelpPage({setToast}){return <div className="help-grid"><div className="panel help-card"><Sparkles size={22}/><h3>How AURORA thinks</h3><p>ML models forecast demand and renewable output. The optimization engine selects a low-fuel dispatch while respecting battery, generator, thermal, reserve, and critical-load constraints.</p><button className="ghost-btn" onClick={()=>setToast({type:'info',text:'Architecture note queued for export.'})}><Download size={14}/> Export architecture note</button></div><div className="panel help-card"><Database size={22}/><h3>Data pipeline</h3><p>Station telemetry + Antarctic weather reanalysis → feature engineering → forecasts → mixed-integer optimization → operator recommendations.</p><button className="ghost-btn" onClick={()=>setToast({type:'info',text:'Data pipeline reference opened.'})}>View pipeline <Zap size={14}/></button></div></div>}
