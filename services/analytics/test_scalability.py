import requests
import time
import random
from datetime import datetime, timedelta

# Configuration
API_URL = "http://127.0.0.1:8001/analyze"
TOTAL_SCANS = 100

def generate_mock_scan(index, previous_scan=None):
    """
    Generates a scan. 
    - Normal scans move slowly across Mumbai.
    - Scan 50 jumps to New York (Impossible Travel).
    - Scan 75 represents a high-frequency burst (ML Anomaly).
    """
    base_time = datetime.now()
    
    # Default: Start in Mumbai (19.0760, 72.8777)
    # Move slightly (0.001 degrees) to simulate realistic movement
    lat = 19.0760 + (index * 0.001)
    lon = 72.8777 + (index * 0.001)
    
    # Timestamp: Each scan is normally 10 minutes apart
    timestamp = (base_time - timedelta(minutes=(TOTAL_SCANS - index) * 10)).isoformat()
    
    # --- ANOMALY INJECTION 1: IMPOSSIBLE TRAVEL ---
    # At index 50, user suddenly appears in New York
    if index == 50:
        lat = 40.7128 
        lon = -74.0060
        print(f"\n[!!!] INJECTING ATTACK: Teleporting to New York at Index 50...")

    # --- ANOMALY INJECTION 2: RAPID SCANNING (ML) ---
    # At index 75, we keep the location same but timestamp is only 1 second after previous
    if index == 75 and previous_scan:
        lat = previous_scan['latitude']
        lon = previous_scan['longitude']
        # Overwrite timestamp to be just 1 second after the last one
        prev_time = datetime.fromisoformat(previous_scan['timestamp'])
        timestamp = (prev_time + timedelta(seconds=1)).isoformat()
        print(f"\n[!!!] INJECTING ATTACK: Rapid Frequency Burst at Index 75...")

    return {
        "drug_id": "drug_TEST_BATCH_001",
        "latitude": lat,
        "longitude": lon,
        "timestamp": timestamp
    }

def run_test():
    print(f"🚀 Starting Scalability Test: {TOTAL_SCANS} requests to {API_URL}...")
    
    last_scan = None
    results = {"LOW": 0, "HIGH": 0, "CRITICAL": 0}
    
    start_time = time.time()

    for i in range(TOTAL_SCANS):
        # Generate data
        current_scan = generate_mock_scan(i, last_scan)
        
        # Prepare payload
        payload = {
            "current_scan": current_scan,
            "last_scan": last_scan
        }
        
        try:
            # Send Request
            response = requests.post(API_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            risk = data['risk_level']
            results[risk] += 1
            
            # visual feedback for anomalies
            if risk in ["CRITICAL", "HIGH"]:
                print(f" -> Scan {i}: {risk} DETECTED! ({data['details']})")
            elif i % 10 == 0:
                print(f" -> Scan {i}: {risk} (Normal)")

            # Update history
            last_scan = current_scan

        except Exception as e:
            print(f"Error on scan {i}: {e}")

    duration = time.time() - start_time
    print("\n" + "="*40)
    print(f"✅ TEST COMPLETE in {duration:.2f} seconds")
    print(f"   Throughput: {TOTAL_SCANS / duration:.1f} scans/sec")
    print(f"   Risk Profile: {results}")
    print("="*40)

if __name__ == "__main__":
    run_test()