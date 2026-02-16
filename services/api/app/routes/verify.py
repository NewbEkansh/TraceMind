import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.models.scan_payload import ScanPayload
from app.core.config import supabase
from app.core.geo import haversine
from dateutil import parser
from datetime import timezone
import httpx
from typing import Optional

router = APIRouter()

# API Key Setup
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
API_SECRET_KEY = os.getenv("API_SECRET_KEY")
print("LOADED API KEY:", API_SECRET_KEY)

if not API_SECRET_KEY:
    raise RuntimeError("API_SECRET_KEY not set in environment")

def verify_api_key(api_key: str = Depends(api_key_header)):
    if api_key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def get_ai_risk_assessment(current_scan: dict, last_scan: Optional[dict] = None) -> str:
    """
    Calls the Analytics AI service (port 8001) for ML-based risk analysis.
    Falls back to 'LOW' if service is unavailable.
    """
    try:
        async with httpx.AsyncClient() as client:
            # Prepare payload for analytics service
            payload = {
                "drug_id": current_scan["drug_id"],
                "latitude": current_scan["latitude"],
                "longitude": current_scan["longitude"],
                "timestamp": current_scan["timestamp"]
            }
            
            # Build request body
            request_body = {"current_scan": payload}
            if last_scan:
                request_body["last_scan"] = {
                    "drug_id": last_scan.get("unit_id", ""),
                    "latitude": last_scan["latitude"],
                    "longitude": last_scan["longitude"],
                    "timestamp": last_scan["timestamp"]
                }
            
            response = await client.post(
                "http://localhost:8001/analyze",
                json=request_body,
                timeout=5.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[AI] Risk assessment: {result.get('risk_level', 'LOW')}")
                return result.get("risk_level", "LOW")
            else:
                print(f"[AI] Service error: {response.status_code}")
                return "LOW"
    except Exception as e:
        print(f"[AI] Failed to reach Analytics service: {e}")
        return "LOW"  # Graceful fallback


@router.post("/verify", dependencies=[Depends(verify_api_key)])
async def verify_scan(payload: ScanPayload):
    try:
        # ── 1. GET PREVIOUS SCAN ──────────────────────────────────
        previous = (
            supabase
            .table("scans")
            .select("*")
            .eq("unit_id", payload.unit_id)
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )

        last_scan = previous.data[0] if previous.data else None
        
        # ── 2. PREPARE DATA FOR AI ANALYSIS ──────────────────────
        current_scan = {
            "drug_id": payload.unit_id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "timestamp": payload.timestamp.isoformat()
        }
        
        # ── 3. GET AI-POWERED RISK ASSESSMENT ────────────────────
        risk_level = await get_ai_risk_assessment(current_scan, last_scan)
        
        anomaly_detected = risk_level in ["CRITICAL", "HIGH"]
        
        # ── 4. CALCULATE METRICS ──────────────────────────────────
        speed_kmh = None
        distance_km = None
        anomaly_reason = None
        
        if last_scan:
            distance_km = haversine(
                last_scan["latitude"],
                last_scan["longitude"],
                payload.latitude,
                payload.longitude
            )
            
            last_timestamp = parser.isoparse(last_scan["timestamp"])
            payload_timestamp = payload.timestamp
            if payload_timestamp.tzinfo is None:
                payload_timestamp = payload_timestamp.replace(tzinfo=timezone.utc)
            
            time_diff_hours = (payload_timestamp - last_timestamp).total_seconds() / 3600
            
            if time_diff_hours > 0:
                speed_kmh = round(distance_km / time_diff_hours, 2)
                distance_km = round(distance_km, 2)
            
            if risk_level == "CRITICAL":
                anomaly_reason = f"AI detected impossible travel ({speed_kmh} km/h exceeds physical limits)"
            elif risk_level == "HIGH":
                anomaly_reason = f"AI flagged suspicious pattern (velocity: {speed_kmh} km/h or unusual timing)"
            else:
                anomaly_reason = f"AI verified normal behavior (speed: {speed_kmh} km/h)"

        # ── 5. STORE SCAN ─────────────────────────────────────────
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
            "distance_km": distance_km,
            "ml_powered": True  # ✨ Now AI-powered!
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