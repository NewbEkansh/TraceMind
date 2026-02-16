from fastapi import FastAPI, HTTPException
from app.routes.verify import router as verify_router
from app.core.blockchain import mint_medicine, verify_medicine, get_medicine_data, revoke_medicine
from app.core.config import supabase
from datetime import datetime, timezone, timedelta

app = FastAPI(title="TraceMind API")
app.include_router(verify_router)


@app.get("/")
async def root():
    return {"message": "TraceMind Backend Running"}


# ── MINT ─────────────────────────────────────────────────────────────────────

@app.post("/mint")
async def mint(
    address: str,
    batch_id: str,
    qr_hash: str,
    manufacturer: str,
    expiry_date: str
):
    """
    Mint a new medicine NFT on Sepolia blockchain.
    expiry_date format: YYYY-MM-DD (e.g. 2027-12-31)
    """
    try:
        expiry_timestamp = int(datetime.strptime(expiry_date, "%Y-%m-%d").timestamp())
        tx_hash = mint_medicine(address, batch_id, qr_hash, manufacturer, expiry_timestamp)
        return {
            "success": True,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_hash}",
            "expiry_date": expiry_date
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── VERIFY (BLOCKCHAIN) ───────────────────────────────────────────────────────

@app.get("/verify/{token_id}")
async def verify(token_id: int):
    """Verify medicine authenticity on blockchain and return all data."""
    try:
        verification = verify_medicine(token_id)
        data = get_medicine_data(token_id)

        if "expiry" in data:
            data["expiry_date"] = datetime.fromtimestamp(data["expiry"]).strftime("%Y-%m-%d")

        return {
            "medicine_id": {"token_id": token_id, "batch_id": data.get("batch_id")},
            "verification": verification,
            "medicine_data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── REVOKE ────────────────────────────────────────────────────────────────────

@app.post("/revoke/{token_id}")
async def revoke(token_id: int):
    """
    Revoke a medicine NFT on blockchain.
    Use when medicine is recalled, expired, or confirmed counterfeit.
    """
    try:
        tx_hash = revoke_medicine(token_id)
        return {
            "success": True,
            "token_id": token_id,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_hash}",
            "message": f"Token {token_id} has been revoked on blockchain"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── FREQUENCY ANALYSIS ────────────────────────────────────────────────────────

@app.get("/frequency/{unit_id}")
async def get_frequency(unit_id: str, window_minutes: int = 10):
    """
    Analyse scan frequency for a unit in a given time window.
    Returns LOW / HIGH risk based on scan count.
    HIGH = 5+ scans within window_minutes.
    """
    try:
        now = datetime.now(timezone.utc)
        window_start = (now - timedelta(minutes=window_minutes)).isoformat()

        response = (
            supabase
            .table("scans")
            .select("id, timestamp, latitude, longitude, anomaly_detected")
            .eq("unit_id", unit_id)
            .gte("timestamp", window_start)
            .order("timestamp", desc=True)
            .execute()
        )

        scan_count = len(response.data)
        HIGH_FREQ_THRESHOLD = 5

        if scan_count >= HIGH_FREQ_THRESHOLD:
            frequency_risk = "HIGH"
            reason = f"Scanned {scan_count} times in {window_minutes} minutes — possible cloned QR"
        else:
            frequency_risk = "LOW"
            reason = f"Scanned {scan_count} times in {window_minutes} minutes — normal"

        return {
            "unit_id": unit_id,
            "window_minutes": window_minutes,
            "scan_count": scan_count,
            "frequency_risk": frequency_risk,
            "reason": reason,
            "scans": response.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── FREQUENCY OVERVIEW (ALL UNITS) ────────────────────────────────────────────

@app.get("/frequency")
async def get_all_frequency(window_minutes: int = 10):
    """
    Returns all units with HIGH frequency scan risk in the last window_minutes.
    Useful for dashboard to highlight suspicious units.
    """
    try:
        now = datetime.now(timezone.utc)
        window_start = (now - timedelta(minutes=window_minutes)).isoformat()

        response = (
            supabase
            .table("scans")
            .select("unit_id, timestamp")
            .gte("timestamp", window_start)
            .execute()
        )

        # Count scans per unit
        unit_counts: dict = {}
        for scan in response.data:
            uid = scan["unit_id"]
            unit_counts[uid] = unit_counts.get(uid, 0) + 1

        HIGH_FREQ_THRESHOLD = 5
        high_risk_units = [
            {
                "unit_id": uid,
                "scan_count": count,
                "frequency_risk": "HIGH",
                "reason": f"{count} scans in {window_minutes} mins"
            }
            for uid, count in unit_counts.items()
            if count >= HIGH_FREQ_THRESHOLD
        ]

        low_risk_units = [
            {
                "unit_id": uid,
                "scan_count": count,
                "frequency_risk": "LOW"
            }
            for uid, count in unit_counts.items()
            if count < HIGH_FREQ_THRESHOLD
        ]

        return {
            "window_minutes": window_minutes,
            "total_units_scanned": len(unit_counts),
            "high_risk_count": len(high_risk_units),
            "high_risk_units": high_risk_units,
            "low_risk_units": low_risk_units
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))