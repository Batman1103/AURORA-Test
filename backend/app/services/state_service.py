from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock

from ..core.config import settings
from ..models.station import StationState


class StateService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._states = {
            "bharati": StationState("bharati", settings.seed_fuel_litres, settings.seed_battery_soc),
            "maitri": StationState("maitri", settings.seed_fuel_litres * 0.91, 68.0),
            "generic": StationState("generic", settings.seed_fuel_litres * 0.82, 61.0),
        }

    def get(self, station: str) -> StationState:
        key = station.lower()
        with self._lock:
            if key not in self._states:
                self._states[key] = StationState(key, settings.seed_fuel_litres, settings.seed_battery_soc)
            return self._states[key]

    def set_mode(self, station: str, mode: str) -> None:
        self.get(station).mode = mode

    SCENARIO_PRESETS = {
        "normal": {"battery_soc": 72.0, "fuel_litres": 218400.0, "mode": "Normal"},
        "blizzard": {"battery_soc": 42.0, "fuel_litres": 182000.0, "mode": "Emergency"},
        "generator_derate": {"battery_soc": 55.0, "fuel_litres": 140000.0, "mode": "Fuel Conservation"},
        "fuel_conservation": {"battery_soc": 80.0, "fuel_litres": 41000.0, "mode": "Fuel Conservation"},
        "battery_depleted": {"battery_soc": 18.0, "fuel_litres": 195000.0, "mode": "Emergency"},
    }

    def set_scenario(self, station: str, scenario: str, battery_soc: float | None = None, fuel_litres: float | None = None) -> StationState:
        state = self.get(station)
        sc_lower = scenario.lower().replace(" ", "_")
        with self._lock:
            state.scenario = scenario
            preset = self.SCENARIO_PRESETS.get(sc_lower)
            if preset:
                state.battery_soc = preset["battery_soc"]
                state.fuel_litres = preset["fuel_litres"]
                state.mode = preset["mode"]

            if battery_soc is not None:
                state.battery_soc = float(max(5.0, min(95.0, battery_soc)))
            if fuel_litres is not None:
                state.fuel_litres = float(max(0.0, fuel_litres))
            return state

    def mark_optimized(self, station: str) -> None:
        self.get(station).last_optimization = datetime.now(timezone.utc).isoformat()


state_service = StateService()
