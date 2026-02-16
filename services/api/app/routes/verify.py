import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.models.scan_payload import ScanPayload
from app.core.config import supabase
from app.core.geo import haversine
from dateutil import parser
from datetime import timezone, timedelta

router = APIRouter()

# Speed thresholds
MAX_SPEED_KMH = 1000        # CRITICAL: impossible travel
HIGH_SPEED_KMH = 500        # HIGH: suspicious speed (faster than fast train)

# Frequency thresholds
HIGH_FREQ_COUNT = 5         # HIGH: scanned more than 5 times in window
HIGH_FREQ_WINDOW_MINS = 10  # within 10 minutes

# API Key Setup
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
API_SECRET_KEY = os.getenv("API_SECRET_KEY")
print("LOADED API KEY:", API_SECRET_KEY)

if not API_SECRET_KEY:
    raise RuntimeError("API_SECRET_KEY not set in environment")


def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/verify", dependencies=[Depends(verify_api_key)])
async def verify_scan(payload: ScanPayload):

    try:
        anomaly_detected = False
        anomaly_reason = None
        risk_level = "LOW"
        speed_kmh = None
        distance_km = None

        # ── 1. SPEED / TRAVEL ANOMALY CHECK ──────────────────────────────────
        previous = (
            supabase
            .table("scans")
            .select("latitude, longitude, timestamp")
            .eq("unit_id", payload.unit_id)
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )

        if previous.data:
            last = previous.data[0]

            distance_km = haversine(
                last["latitude"],
                last["longitude"],
                payload.latitude,
                payload.longitude
            )

            last_timestamp = parser.isoparse(last["timestamp"])
            payload_timestamp = payload.timestamp

            if payload_timestamp.tzinfo is None:
                payload_timestamp = payload_timestamp.replace(tzinfo=timezone.utc)

            time_diff_hours = (
                (payload_timestamp - last_timestamp).total_seconds() / 3600
            )

            if time_diff_hours > 0:
                speed_kmh = round(distance_km / time_diff_hours, 2)
                distance_km = round(distance_km, 2)

                if speed_kmh > MAX_SPEED_KMH:
                    # CRITICAL: physically impossible travel
                    anomaly_detected = True
                    risk_level = "CRITICAL"
                    anomaly_reason = f"Impossible travel detected ({speed_kmh} km/h)"

                elif speed_kmh > HIGH_SPEED_KMH:
                    # HIGH: suspicious but not impossible
                    anomaly_detected = True
                    risk_level = "HIGH"
                    anomaly_reason = f"Suspicious travel speed ({speed_kmh} km/h)"

        # ── 2. HIGH FREQUENCY SCAN CHECK ─────────────────────────────────────
        # Only run if not already CRITICAL (don't downgrade)
        if risk_level != "CRITICAL":
            payload_timestamp = payload.timestamp
            if payload_timestamp.tzinfo is None:
                payload_timestamp = payload_timestamp.replace(tzinfo=timezone.utc)

            window_start = (
                payload_timestamp - timedelta(minutes=HIGH_FREQ_WINDOW_MINS)
            ).isoformat()

            freq_response = (
                supabase
                .table("scans")
                .select("id")
                .eq("unit_id", payload.unit_id)
                .gte("timestamp", window_start)
                .execute()
            )

            scan_count = len(freq_response.data)

            if scan_count >= HIGH_FREQ_COUNT:
                anomaly_detected = True
                # Only upgrade to HIGH if currently LOW
                if risk_level == "LOW":
                    risk_level = "HIGH"
                    anomaly_reason = (
                        f"High frequency scanning: {scan_count} scans "
                        f"in {HIGH_FREQ_WINDOW_MINS} minutes"
                    )
                else:
                    # Already HIGH from speed — append frequency info
                    anomaly_reason += (
                        f" + High frequency ({scan_count} scans "
                        f"in {HIGH_FREQ_WINDOW_MINS} mins)"
                    )

        # ── 3. STORE SCAN ─────────────────────────────────────────────────────
        data = {
            "unit_id": payload.unit_id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "timestamp": payload.timestamp.isoformat(),
            "anomaly_detected": anomaly_detected,
            "anomaly_reason": anomaly_reason,
            "risk_level": risk_level,
            "speed_kmh": speed_kmh,
            "distance_km": distance_km,
        }

        insert_response = supabase.table("scans").insert(data).execute()

        if not insert_response.data:
            raise Exception("Insert failed")

        return {
            "status": "stored",
            "anomaly_detected": anomaly_detected,
            "risk_level": risk_level,
            "anomaly_reason": anomaly_reason,
            "speed_kmh": speed_kmh,
            "distance_km": distance_km
        }

    except Exception as e:
        print("FULL ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scans", dependencies=[Depends(verify_api_key)])
async def get_all_scans():
    try:
        response = (
            supabase
            .table("scans")
            .select("*")
            .order("timestamp", desc=True)
            .limit(100)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{unit_id}", dependencies=[Depends(verify_api_key)])
async def get_history(unit_id: str):
    try:
        response = (
            supabase
            .table("scans")
            .select("*")
            .eq("unit_id", unit_id)
            .order("timestamp", desc=True)
            .execute()
        )
        return {
            "unit_id": unit_id,
            "total_records": len(response.data),
            "history": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/{unit_id}", dependencies=[Depends(verify_api_key)])
async def get_analytics(unit_id: str):
    try:
        response = (
            supabase
            .table("scans")
            .select("anomaly_detected")
            .eq("unit_id", unit_id)
            .execute()
        )

        total_scans = len(response.data)
        total_anomalies = sum(
            1 for r in response.data if r["anomaly_detected"]
        )

        anomaly_rate = (
            round((total_anomalies / total_scans) * 100, 2)
            if total_scans > 0 else 0
        )

        return {
            "unit_id": unit_id,
            "total_scans": total_scans,
            "total_anomalies": total_anomalies,
            "anomaly_rate_percent": anomaly_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))