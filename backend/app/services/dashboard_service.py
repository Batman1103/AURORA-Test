from __future__ import annotations

from ..core.config import settings
from .forecast_service import ForecastService
from .state_service import state_service
from .weather_service import weather_service


class DashboardService:
    def __init__(self, forecast_service: ForecastService):
        self.forecast = forecast_service

    def snapshot(self, station: str) -> dict:
        row = self.forecast.simulator.latest(station)
        state = state_service.get(station)
        load = float(row["load_kw"])
        solar = float(row["solar_kw"])
        wind = float(row["wind_kw"])
        renewable_pct = min(100.0, (solar + wind) / max(load, 1e-6) * 100.0)
        diesel_needed = max(0.0, load - solar - wind)
        active_gens = 1 if diesel_needed <= settings.generator_capacity_kw else (2 if diesel_needed <= settings.generator_capacity_kw * 2 else 3)
        if diesel_needed <= 5.0 and state.battery_soc > 30:
            active_gens = 0

        # Physical fuel consumption: generator burn rate (0.29 L/kWh) applied to required diesel output
        effective_gen_kw = max(settings.generator_min_kw if active_gens > 0 else 0.0, min(settings.generator_capacity_kw * max(1, active_gens), diesel_needed))
        daily_consumption = max(180.0, effective_gen_kw * 24 * settings.generator_fuel_l_per_kwh)
        days = round(state.fuel_litres / daily_consumption, 0)

        # Retrieve real-time Antarctic station weather
        w = weather_service.get_weather(station)
        if state.scenario == "blizzard":
            temp_c = min(-28.5, w["temperatureC"] - 14.0)
            wind_ms = max(25.0, w["windSpeedMs"] * 2.2)
            condition = "Severe Blizzard"
        else:
            temp_c = w["temperatureC"]
            wind_ms = w["windSpeedMs"]
            condition = w["condition"]

        return {
            "station": station,
            "timestamp": row["timestamp"].isoformat(),
            "loadKw": round(load, 2),
            "batterySoc": round(state.battery_soc, 1),
            "fuelLitres": round(state.fuel_litres, 0),
            "renewablePct": round(renewable_pct, 1),
            "daysToExhaustion": round(days, 0),
            "solarKw": round(solar, 2),
            "windKw": round(wind, 2),
            "thermalKw": round(float(row.get("heating_load_kw", 112.0)), 2),
            "temperatureC": temp_c,
            "windSpeedMs": wind_ms,
            "weatherCondition": condition,
            "weatherSource": w.get("source", "live"),
            "dailyConsumptionLitres": round(daily_consumption, 0),
            "activeGenerators": active_gens,
            "mode": state.mode,
            "scenario": state.scenario,
            "model": "XGBoost",
            "metrics": self.forecast.metrics,
        }

