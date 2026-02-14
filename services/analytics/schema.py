from pydantic import BaseModel
from typing import Optional

class ScanData(BaseModel):
    drug_id: str
    latitude: float
    longitude: float
    timestamp: str  

class ThreatAssessment(BaseModel):
    drug_id: str
    risk_level: str
    details: str
    timestamp: str