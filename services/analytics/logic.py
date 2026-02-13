import math
from datetime import datetime
from schema import ScanData, ThreatAssessment

# CONSTANTS
EARTH_RADIUS_KM = 6371.0
MAX_POSSIBLE_SPEED_KMH = 900.0  # Commercial flight speed approx. 900 km/h

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's surface.
    Returns distance in kilometers.
    """
    # Convert decimal degrees to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(dphi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return EARTH_RADIUS_KM * c

def analyze_scan(current_scan: ScanData, last_scan: ScanData | None) -> ThreatAssessment:
    """
    Analyzes the current scan against the previous scan history.
    """
    # CASE 1: First time scan (No history)
    if last_scan is None:
        return ThreatAssessment(
            is_anomaly=False,
            risk_score=0.0,
            risk_level="Low",
            details="First scan recorded. Product registered on chain."
        )

    # CASE 2: Calculate Space-Time Delta
    distance_km = calculate_haversine_distance(
        current_scan.latitude, current_scan.longitude,
        last_scan.latitude, last_scan.longitude
    )

    # Time difference in hours
    time_delta = (current_scan.timestamp - last_scan.timestamp).total_seconds() / 3600.0

    # Edge Case: Simultaneous scans (prevent division by zero)
    if time_delta <= 0:
        if distance_km > 0.5: # If distance is significant (>500m) but time is 0
            return ThreatAssessment(
                is_anomaly=True,
                risk_score=1.0,
                risk_level="Critical",
                details=f"Impossible Teleportation: Moved {distance_km:.2f} km in 0 seconds."
            )
        else:
            return ThreatAssessment(
                is_anomaly=False,
                risk_score=0.1,
                risk_level="Low",
                details="Duplicate scan detected at same location."
            )

    # CASE 3: Velocity Check
    speed_kmh = distance_km / time_delta

    if speed_kmh > MAX_POSSIBLE_SPEED_KMH:
        return ThreatAssessment(
            is_anomaly=True,
            risk_score=0.95,
            risk_level="Critical",
            details=f"Impossible Travel: Speed {speed_kmh:.0f} km/h exceeds max threshold ({MAX_POSSIBLE_SPEED_KMH} km/h)."
        )
    elif speed_kmh > 150: # Example: Too fast for a truck, but maybe a plane?
        return ThreatAssessment(
            is_anomaly=False, # Not strictly impossible, but suspicious
            risk_score=0.4,
            risk_level="Medium",
            details=f"High Velocity: {speed_kmh:.0f} km/h. flagged for review."
        )
    
    return ThreatAssessment(
        is_anomaly=False,
        risk_score=0.0,
        risk_level="Low",
        details=f"Valid movement. Speed: {speed_kmh:.0f} km/h."
    )

# --- QUICK TEST BLOCK (Run this file directly to test) ---
if __name__ == "__main__":
    # Mock Data: Mumbai at 10:00 AM
    scan_a = ScanData(
        product_id="123", 
        latitude=19.0760, longitude=72.8777, 
        timestamp=datetime(2023, 10, 27, 10, 0, 0),
        device_id="dev_1"
    )
    
    # Mock Data: Delhi at 10:30 AM (Impossible! 1200km in 30 mins)
    scan_b = ScanData(
        product_id="123", 
        latitude=28.7041, longitude=77.1025, 
        timestamp=datetime(2023, 10, 27, 10, 30, 0),
        device_id="dev_2"
    )

    print("Testing TraceMind Sentinel Logic...")
    result = analyze_scan(scan_b, scan_a)
    print(f"Result: {result.risk_level} - {result.details}")