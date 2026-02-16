import os
from supabase import create_client, Client
from datetime import datetime

# Keys (Keep your existing keys here)
url: str = "https://tavwymdjfhhehklusacz.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdnd5bWRqZmhoZWhrbHVzYWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTEzNzMsImV4cCI6MjA4NjUyNzM3M30.HKXtY7FUYWd-66qVrVIQfWYEivasN34ibBtX0ksPBA8"

supabase: Client = create_client(url, key)

def push_fake_alert():
    print("🚀 Push-Testing TraceMind Alert System...")
    
    # Updated payload to match your friend's schema exactly
    data = {
        "unit_id": "drug_REAL_TEST_999",       # Was drug_id
        "anomaly_reason": "Impossible Travel Detected (Mumbai -> Delhi in 5 mins)", # Was details
        "anomaly_detected": True,              # Was risk_level (mapped to boolean)
        "latitude": 28.7041,                   # Split from location array
        "longitude": 77.1025,                  # Split from location array
        "timestamp": datetime.utcnow().isoformat(),
        
        # Optional fields based on your screenshot, good to fill if possible
        "speed_kmh": 950.5,
        "distance_km": 1400.2
    }
    
    try:
        response = supabase.table("scans").insert(data).execute()
        print("✅ Alert sent to Supabase!", response)
    except Exception as e:
        print("❌ Error sending alert:", e)

if __name__ == "__main__":
    push_fake_alert()