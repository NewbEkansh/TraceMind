import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.models.scan_payload import ScanPayload
from app.core.config import supabase
from app.core.geo import haversine
from dateutil import parser
from datetime import timezone

router = APIRouter()

MAX_SPEED_KMH = 1000

# 🔐 API Key Setup
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
API_SECRET_KEY = os.getenv("API_SECRET_KEY")
print("LOADED API KEY:", API_SECRET_KEY)

if not API_SECRET_KEY:
    raise RuntimeError("API_SECRET_KEY not set in environment")


def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ---------------------------------------------------
# VERIFY ENDPOINT
# ---------------------------------------------------

@router.post("/verify", dependencies=[Depends(verify_api_key)])
async def verify_scan(payload: ScanPayload):

    try:
        anomaly_detected = False
        anomaly_reason = None
        speed_kmh = None
        distance_km = None

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
                    anomaly_detected = True
                    anomaly_reason = "Impossible travel detected"

        data = {
            "unit_id": payload.unit_id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "timestamp": payload.timestamp.isoformat(),
            "anomaly_detected": anomaly_detected,
            "anomaly_reason": anomaly_reason,
            "speed_kmh": speed_kmh,
            "distance_km": distance_km
        }

        insert_response = supabase.table("scans").insert(data).execute()

        # ✅ Correct v2 handling
        if not insert_response.data:
            raise Exception("Insert failed")

        return {
            "status": "stored",
            "anomaly_detected": anomaly_detected,
            "anomaly_reason": anomaly_reason,
            "speed_kmh": speed_kmh,
            "distance_km": distance_km
        }

    except Exception as e:
        print("FULL ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------
# HISTORY ENDPOINT
# ---------------------------------------------------

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


# ---------------------------------------------------
# ANALYTICS ENDPOINT
# ---------------------------------------------------

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