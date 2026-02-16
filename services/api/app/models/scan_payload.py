from pydantic import BaseModel
from datetime import datetime

class ScanPayload(BaseModel):
    unit_id: str
    latitude: float
    longitude: float
    timestamp: datetime