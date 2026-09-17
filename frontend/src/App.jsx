import React, { useCallback, useEffect, useState } from 'react';
import { api } from './services/api';
import AppShell from './components/layout/AppShell';
import EnergyFlow from './components/energy/EnergyFlow';
import Overview from './pages/Overview';
import { LiveMonitor, EnergyFlowPage, Forecasting, Optimization, FuelManagement, BatteryManagement, Reports, Alerts, SettingsPage, HelpPage } from './pages/ModulePages';

export default function App(){
  const [active,setActive]=useState('Overview');
  const [station,setStation]=useState('Bharati Station');
  const [systemMode,setSystemMode]=useState('Normal');
  const [horizon,setHorizon]=useState('24 Hours');
  const [running,setRunning]=useState(false);
  const [lastOptimization,setLastOptimization]=useState(null);
  const [toast,setToast]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [dashboard,setDashboard]=useState(null);
  const [forecasts,setForecasts]=useState({load:null, renewable:null});
  const [energyLive,setEnergyLive]=useState(null);
  const [fuelStatus,setFuelStatus]=useState(null);
  const [batteryStatus,setBatteryStatus]=useState(null);
  const [alerts,setAlerts]=useState([]);
  const [optimizationHistory,setOptimizationHistory]=useState([]);
  const [apiError,setApiError]=useState(null);
  const [optimizationResult,setOptimizationResult]=useState(null);
  const [lastSyncTime,setLastSyncTime]=useState(Date.now());

  const stationKey = (() => {
    const s = station.toLowerCase();
    if (s.includes('carlini')) return 'carlini';
    if (s.includes('mcmurdo')) return 'mcmurdo';
    if (s.includes('vostok')) return 'vostok';
    if (s.includes('south') || s.includes('pole')) return 'south_pole';
    if (s.includes('maitri')) return 'maitri';
    return 'bharati';
  })();

  const refreshData = useCallback(async()=>{
    try {
      const [dash, fc, el, fs, bs, al, hist] = await Promise.allSettled([
        api.getDashboard(stationKey),
        api.getForecasts(stationKey, 24),
        api.getEnergyLive(stationKey),
        api.getFuelStatus(stationKey),
        api.getBatteryStatus(stationKey),
        api.getAlerts(stationKey),
        api.getOptimizationHistory(10),
      ]);

      if (dash.status === 'fulfilled' && dash.value) setDashboard(dash.value);
      if (fc.status === 'fulfilled' && fc.value) setForecasts(fc.value);
      if (el.status === 'fulfilled' && el.value) setEnergyLive(el.value);
      if (fs.status === 'fulfilled' && fs.value) setFuelStatus(fs.value);
      if (bs.status === 'fulfilled' && bs.value) setBatteryStatus(bs.value);
      if (al.status === 'fulfilled' && al.value) setAlerts(al.value?.alerts || []);
      if (hist.status === 'fulfilled' && hist.value) setOptimizationHistory(hist.value);

      setLastSyncTime(Date.now());
      setApiError(null);
    } catch (error) {
      setApiError(error.message);
    }
  }, [stationKey]);

  useEffect(()=>{ refreshData(); const id=setInterval(refreshData,15000); return ()=>clearInterval(id); },[refreshData]);

  const runOptimization=async()=>{
    if(running) return;
    setRunning(true);
    setToast({type:'info',text:`AURORA is optimizing ${horizon.toLowerCase()} in ${systemMode.toLowerCase()} mode…`});
    try {
      const result=await api.runOptimization({station,mode:systemMode,horizon});
      const timeStr = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      setLastOptimization(`Today, ${timeStr}`);
      setOptimizationResult(result);
      setToast({type:'success',text:`Optimization complete · ${Number(result.fuelSavedLitres || 0).toFixed(1)} L fuel saving opportunity identified.`});
      await refreshData();
    } catch (error) {
      setToast({type:'error',text:`Optimization failed · ${error.message}`});
    } finally { setRunning(false); }
  };

  const applyScenario=async(scenarioName)=>{
    setToast({type:'info',text:`Applying scenario: ${scenarioName}…`});
    try {
      await api.runScenario({station: stationKey, scenario: scenarioName});
      setToast({type:'success',text:`Scenario updated: ${scenarioName}`});
      await refreshData();
    } catch (error) {
      setToast({type:'error',text:`Scenario update failed: ${error.message}`});
    }
  };

  const content={
    Overview:<Overview dashboard={dashboard} forecasts={forecasts} optimizationResult={optimizationResult} systemMode={systemMode} setSystemMode={setSystemMode} horizon={horizon} setHorizon={setHorizon} onRunOptimization={runOptimization} running={running} lastOptimization={lastOptimization} setToast={setToast} apiError={apiError} station={station} alerts={alerts}/>,
    'Live Monitor':<LiveMonitor dashboard={dashboard} energyLive={energyLive}/>,
    'Energy Flow':<EnergyFlowPage EnergyFlow={EnergyFlow} dashboard={dashboard} energyLive={energyLive}/>,
    Forecasting:<Forecasting forecasts={forecasts} dashboard={dashboard}/>,
    Optimization:<Optimization optimizationResult={optimizationResult} onRunOptimization={runOptimization} running={running} systemMode={systemMode} setSystemMode={setSystemMode} horizon={horizon} setHorizon={setHorizon}/>,
    'Fuel Management':<FuelManagement dashboard={dashboard} fuelStatus={fuelStatus}/>,
    'Battery Management':<BatteryManagement dashboard={dashboard} batteryStatus={batteryStatus}/>,
    'Reports & Analytics':<Reports dashboard={dashboard} optimizationResult={optimizationResult} history={optimizationHistory}/>,
    'Alerts & Events':<Alerts alerts={alerts} setToast={setToast} refreshAlerts={refreshData}/>,
    Settings:<SettingsPage dashboard={dashboard} onApplyScenario={applyScenario} setToast={setToast}/>,
    'Help & Documentation':<HelpPage setToast={setToast}/>,
  };

  return (
    <AppShell
      active={active}
      onNavigate={setActive}
      station={station}
      setStation={setStation}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      dashboard={dashboard}
      alerts={alerts}
      lastSyncTime={lastSyncTime}
      onRefresh={refreshData}
      toast={toast}
      onExport={()=>setToast({type:'info',text:'AURORA export package prepared.'})}
    >
      {content[active] || content.Overview}
    </AppShell>
  );
}
