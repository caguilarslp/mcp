"""
Quick Test for API Server
Simple verification that endpoints are working
"""

import requests
import time
import sys

def test_api_basic():
    """Basic API test without complex dependencies"""
    base_url = "http://localhost:8000"
    headers = {"X-API-Key": "wadm_master_2024"}
    
    print("🧪 Quick API Test")
    print("=" * 30)
    
    # Test 1: Root endpoint
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✅ Root endpoint working")
            data = response.json()
            print(f"   API: {data.get('name')} v{data.get('version')}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
        return False
    
    # Test 2: Health check
    try:
        response = requests.get(f"{base_url}/api/v1/system/health")
        if response.status_code == 200:
            print("✅ Health check working")
            data = response.json()
            print(f"   Status: {data.get('status')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # Test 3: Auth verification
    try:
        response = requests.get(f"{base_url}/api/v1/auth", headers=headers)
        if response.status_code == 200:
            print("✅ Authentication working")
        else:
            print(f"❌ Auth failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Auth error: {e}")
    
    # Test 4: Symbols endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/market/symbols", headers=headers)
        if response.status_code == 200:
            print("✅ Symbols endpoint working")
            data = response.json()
            print(f"   Symbols: {len(data)} configured")
        else:
            print(f"❌ Symbols failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Symbols error: {e}")
    
    # Test 5: Market stats
    try:
        response = requests.get(f"{base_url}/api/v1/market/stats/BTCUSDT", headers=headers)
        if response.status_code == 200:
            print("✅ Market stats working")
            data = response.json()
            print(f"   BTCUSDT: ${data.get('close', 'N/A')}")
        else:
            print(f"❌ Market stats failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Market stats error: {e}")
    
    # Test 6: Cache stats
    try:
        response = requests.get(f"{base_url}/api/v1/system/cache/stats", headers=headers)
        if response.status_code == 200:
            print("✅ Cache system working")
            data = response.json()
            cache_stats = data.get('cache_stats', {})
            print(f"   Cache type: {cache_stats.get('type', 'unknown')}")
        else:
            print(f"❌ Cache stats failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Cache stats error: {e}")
    
    print("\n🏁 Quick test completed!")
    print("\nFor full testing, ensure dependencies are installed:")
    print("pip install aiohttp websockets-client")
    print("Then run: python test_task_030.py")

def main():
    print("⚡ Quick API Test - No Complex Dependencies")
    print("Checking if API server is running...")
    
    # Wait a moment for server to be ready
    time.sleep(2)
    
    test_api_basic()

if __name__ == "__main__":
    main()
