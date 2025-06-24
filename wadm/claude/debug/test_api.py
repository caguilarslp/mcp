"""
Test FastAPI Server
Quick test script to verify API is working
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_KEY = "wadm-dev-key-change-in-production"

def test_api():
    """Test various API endpoints"""
    
    headers = {"X-API-Key": API_KEY}
    
    print("🧪 Testing WADM API...")
    print("=" * 50)
    
    # Test root
    print("\n1. Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test health
    print("\n2. Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/system/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test auth verify
    print("\n3. Testing auth verification...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/auth/keys/verify", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test system metrics
    print("\n4. Testing system metrics...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/system/metrics", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test database status
    print("\n5. Testing database status...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/system/database", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test symbols
    print("\n6. Testing symbols endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/market/symbols", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {len(response.json())} symbols found")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test trades
    print("\n7. Testing trades endpoint...")
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/market/trades/BTCUSDT",
            headers=headers,
            params={"per_page": 5}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Total trades: {data['total']}")
            print(f"Showing {len(data['data'])} trades")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test rate limiting
    print("\n8. Testing rate limiting...")
    print("Making 5 rapid requests...")
    for i in range(5):
        try:
            response = requests.get(f"{BASE_URL}/api/v1/system/health")
            remaining = response.headers.get("X-RateLimit-Remaining", "?")
            print(f"Request {i+1}: Status {response.status_code}, Remaining: {remaining}")
        except Exception as e:
            print(f"Request {i+1}: Error - {e}")
    
    print("\n✅ API tests completed!")

if __name__ == "__main__":
    test_api()
