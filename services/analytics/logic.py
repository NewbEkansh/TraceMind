import math
import numpy as np
from datetime import datetime
from sklearn.ensemble import IsolationForest
from typing import Dict, Tuple, List

# --- Configuration ---
EARTH_RADIUS_KM = 6371
VELOCITY_THRESHOLD_KMH = 900.0  # Approx commercial flight speed
CONTAMINATION_RATE = 0.05       # Estimated % of anomalies in data
RANDOM_STATE = 42

class SentinelAI:
    def __init__(self):
        self.model = IsolationForest(contamination=CONTAMINATION_RATE, random_state=RANDOM_STATE)
        self.is_trained = False
        # Train immediately on initialization so the API is ready to serve
        self._train_initial_model()

    def _train_initial_model(self):
        """
        Bootstraps the model with synthetic 'normal' scanning behavior.
        We simulate 200 normal scans to teach the model what 'Good' looks like.
        Features: [hour_of_day, scan_frequency_score]
        """
        # Normal behavior: Scans mostly between 8 AM - 8 PM (8-20), with low frequency scores (0-2)
        # using numpy to generate a normal distribution of data
        X_train = np.random.normal(loc=[14, 1.0], scale=[4, 0.5], size=(200, 2))
        self.model.fit(X_train)
        self.is_trained = True
        print(f" [TraceMind] SentinelAI Model initialized and trained on {len(X_train)} synthetic records.")

    def haversine_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """
        Calculates the great-circle distance between two points on the Earth surface.
        """
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) * math.sin(dlon / 2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return EARTH_RADIUS_KM * c

    def calculate_velocity(self, prev_scan: Dict, current_scan: Dict) -> float:
        """
        Returns velocity in km/h between two scan events.
        """
        t1 = datetime.fromisoformat(prev_scan['timestamp'])
        t2 = datetime.fromisoformat(current_scan['timestamp'])
        
        time_diff_hours = abs((t2 - t1).total_seconds()) / 3600.0
        
        # Avoid division by zero (simultaneous scans = infinite speed)
        if time_diff_hours < 0.001:
            return 99999.0

        distance = self.haversine_distance(
            (prev_scan['latitude'], prev_scan['longitude']),
            (current_scan['latitude'], current_scan['longitude'])
        )
        
        return distance / time_diff_hours

    def predict_anomaly_score(self, hour: int, frequency_score: float) -> int:
        """
        Uses Isolation Forest to detect statistical anomalies.
        Returns: -1 for Anomaly, 1 for Normal
        """
        features = np.array([[hour, frequency_score]])
        return self.model.predict(features)[0]

    def analyze_risk(self, current_scan: Dict, history: List[Dict]) -> str:
        """
        The Master Logic: Combines Physics (Velocity) and ML (Isolation Forest).
        """
        if history:
            last_scan = history[-1]
            velocity = self.calculate_velocity(last_scan, current_scan)
            print(f" [Debug] Calculated Velocity: {velocity:.2f} km/h")
            
            if velocity > VELOCITY_THRESHOLD_KMH:
                return "CRITICAL" # Physically impossible

        scan_time = datetime.fromisoformat(current_scan['timestamp'])
        hour = scan_time.hour
        
        # If the last scan was very recent (< 5 mins), the score spikes.
        freq_score = 1.0 
        if history:
            last_time = datetime.fromisoformat(history[-1]['timestamp'])
            seconds_diff = abs((scan_time - last_time).total_seconds())
            if seconds_diff < 300: # Less than 5 mins
                freq_score = 5.0   # High frequency spike
        
        ml_verdict = self.predict_anomaly_score(hour, freq_score)
        
        if ml_verdict == -1:
            return "HIGH" # Statistical anomaly (e.g., 3 AM scan or rapid burst)

        return "LOW"

# Export the singleton instance
engine = SentinelAI()