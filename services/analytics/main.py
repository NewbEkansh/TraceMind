from fastapi import FastAPI, HTTPException
from typing import List, Optional
from schema import ScanData, ThreatAssessment
from logic import analyze_scan

app = FastAPI(title="TraceMind AI Sentinel")

@app.get("/")
async def health_check():
    return {"status": "online", "service": "TraceMind Intelligence Engine"}

@app.post("/analyze", response_model=ThreatAssessment)
async def perform_analysis(current_scan: ScanData, last_scan: Optional[ScanData] = None):
    """
    Analyzes a scan against history to detect counterfeit anomalies.
    """
    try:
        assessment = analyze_scan(current_scan, last_scan)
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # This runs the server on port 8001 to avoid conflict with the main API
    uvicorn.run(app, host="0.0.0.0", port=8001)