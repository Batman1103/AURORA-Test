from datetime import datetime, timezone
from ..core.config import settings
from .state_service import state_service


class AlertService:
    def build(self, station: str) -> list[dict]:
        state = state_service.get(station)
        now = datetime.now()
        t1 = (now.replace(minute=max(0, (now.minute - 15) % 60))).strftime("%I:%M %p")
        t2 = (now.replace(minute=max(0, (now.minute - 45) % 60))).strftime("%I:%M %p")
        alerts = [
            {
                "id": "fuel-efficiency",
                "severity": "warning",
                "title": "Fuel consumption watch",
                "body": "Generator dispatch is operating near the upper efficiency threshold.",
                "timestamp": t1,
                "action": "Shift flexible load and re-run optimization",
            },
            {
                "id": "polar-weather",
                "severity": "info",
                "title": "Polar weather pattern active",
                "body": "Renewable generation fluctuating with local atmospheric gradient.",
                "timestamp": t2,
                "action": "Increase wind turbine utilization and monitor battery SOC",
            },
        ]
        if state.fuel_litres < settings.fuel_reserve_litres * 1.5:
            alerts.insert(0, {
                "id": "fuel-risk",
                "severity": "danger",
                "title": "Fuel reserve risk",
                "body": "Projected fuel inventory is approaching the conservation threshold.",
                "timestamp": "Now",
                "action": "Activate Fuel Conservation Mode",
            })
        if state.battery_soc < 25:
            alerts.insert(0, {
                "id": "battery-risk",
                "severity": "danger",
                "title": "Battery reserve low",
                "body": "Battery state of charge is below the configured reserve.",
                "timestamp": "Now",
                "action": "Stop discretionary discharge",
            })
        return alerts
