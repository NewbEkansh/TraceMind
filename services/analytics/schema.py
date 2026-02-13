from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# This defines the data structure for a single scan event
class ScanData(BaseModel):
    product_id: str
    latitude: float = Field(..., ge=-90, le=90, description="GPS Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="GPS Longitude")
    timestamp: datetime = Field(..., description="Time of scan (UTC)")
    device_id: str = Field(..., description="Unique ID of the scanning device")
    
    # Optional: Extra metadata for future ML features
    location_name: Optional[str] = None 

# This defines the response your AI service will send back
class ThreatAssessment(BaseModel):
    is_anomaly: bool
    risk_score: float = Field(..., ge=0.0, le=1.0, description="0.0 is safe, 1.0 is confirmed fake")
    risk_level: str = Field(..., pattern="^(Low|Medium|High|Critical)$")
    details: str = Field(..., description="Explanation for the risk score")