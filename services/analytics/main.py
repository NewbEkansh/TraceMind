from fastapi import FastAPI, HTTPException
from typing import Optional
from schema import ScanData, ThreatAssessment # Ensure these match your schema.py
from logic import engine  # Importing the initialized AI 'engine' instance

app = FastAPI(title="TraceMind AI Sentinel")

@app.get("/")
async def health_check():
    """
    Health check endpoint to verify the service and AI model status.
    """
    return {
        "status": "online", 
        "service": "TraceMind Intelligence Engine",
        "model_trained": engine.is_trained,  # Verifies the Isolation Forest is ready
        "model_type": "Hybrid (Heuristic + Isolation Forest)"
    }

@app.post("/analyze", response_model=ThreatAssessment)
async def perform_analysis(current_scan: ScanData, last_scan: Optional[ScanData] = None):
    """
    Analyzes a scan against history to detect counterfeit anomalies.
    """
    try:
        # 1. Prepare History
        # The new engine expects a list of dictionaries for history.
        # If last_scan exists, we put it in a list; otherwise, pass an empty list.
        history = []
        if last_scan:
            history.append(last_scan.dict())

        # This calls the new Hybrid Logic (Isolation Forest + Velocity Check)
        # Returns a string: "CRITICAL", "HIGH", or "LOW"
        risk_level_str = engine.analyze_risk(current_scan.dict(), history)

        # We assume your ThreatAssessment schema has a 'risk_level' field.
        # IF your schema uses different field names, update them here!
        return ThreatAssessment(
            drug_id=current_scan.drug_id,
            risk_level=risk_level_str,
            details=f"TraceMind AI Analysis complete. Detected risk: {risk_level_str}",
            timestamp=current_scan.timestamp
        )

    except Exception as e:
        # Log the error for debugging
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Runs the server on port 8001 to avoid conflict with the main API
    uvicorn.run(app, host="0.0.0.0", port=8001)