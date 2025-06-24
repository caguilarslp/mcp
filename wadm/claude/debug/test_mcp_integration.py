"""Test MCP Integration through WADM API."""

import asyncio
import httpx
import json
from datetime import datetime


async def test_mcp_integration():
    """Test the MCP integration endpoints."""
    
    base_url = "http://localhost:8000"
    api_key = "wadm-master-key-2024"  # Master key for testing
    
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }
    
    print(f"\n{'='*60}")
    print("🧪 Testing MCP Integration")
    print(f"{'='*60}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API URL: {base_url}")
    print(f"{'='*60}\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test 1: Check MCP health
        print("1️⃣ Testing MCP Health Check...")
        try:
            response = await client.get(f"{base_url}/api/v1/mcp/health", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Healthy: {data.get('healthy', False)}")
                print(f"   Version: {data.get('version', 'unknown')}")
                print(f"   Tools Count: {data.get('tools_count', 0)}")
                print("   ✅ Health check passed!\n")
            else:
                print(f"   ❌ Error: {response.text}\n")
        except Exception as e:
            print(f"   ❌ Exception: {e}\n")
        
        # Test 2: List available tools
        print("2️⃣ Testing List MCP Tools...")
        try:
            response = await client.get(f"{base_url}/api/v1/mcp/tools", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                tools = response.json()
                print(f"   Total tools: {len(tools)}")
                # Show first 5 tools
                for i, tool in enumerate(tools[:5]):
                    print(f"   - {tool['name']} ({tool['category']})")
                if len(tools) > 5:
                    print(f"   ... and {len(tools) - 5} more tools")
                print("   ✅ Tool listing passed!\n")
            else:
                print(f"   ❌ Error: {response.text}\n")
        except Exception as e:
            print(f"   ❌ Exception: {e}\n")
        
        # Test 3: Call a simple MCP tool (get_ticker)
        print("3️⃣ Testing MCP Tool Call (get_ticker)...")
        try:
            payload = {
                "tool": "get_ticker",
                "params": {
                    "symbol": "BTCUSDT"
                }
            }
            response = await client.post(
                f"{base_url}/api/v1/mcp/call",
                headers=headers,
                json=payload
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Success: {data.get('success', False)}")
                print(f"   Execution Time: {data.get('execution_time_ms', 0)}ms")
                print(f"   Tokens Used: {data.get('tokens_used', 0)}")
                if data.get('data'):
                    print(f"   Price: ${data['data'].get('price', 'N/A')}")
                    print(f"   24h Change: {data['data'].get('change24h', 'N/A')}%")
                print("   ✅ Tool call passed!\n")
            else:
                print(f"   ❌ Error: {response.text}\n")
        except Exception as e:
            print(f"   ❌ Exception: {e}\n")
        
        # Test 4: Wyckoff Analysis
        print("4️⃣ Testing Wyckoff Analysis...")
        try:
            response = await client.post(
                f"{base_url}/api/v1/mcp/analyze/wyckoff/BTCUSDT?timeframe=60",
                headers=headers
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data'):
                    result = data['data']
                    print(f"   Phase: {result.get('phase', 'N/A')}")
                    print(f"   Confidence: {result.get('confidence', 0)}%")
                    print(f"   Recommendation: {result.get('recommendation', 'N/A')}")
                print("   ✅ Wyckoff analysis passed!\n")
            else:
                print(f"   ❌ Error: {response.text}\n")
        except Exception as e:
            print(f"   ❌ Exception: {e}\n")
        
        # Test 5: Complete Analysis
        print("5️⃣ Testing Complete Analysis...")
        try:
            response = await client.post(
                f"{base_url}/api/v1/mcp/analyze/complete/ETHUSDT",
                headers=headers
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data'):
                    result = data['data']
                    summary = result.get('summary', {})
                    print(f"   Bias: {summary.get('bias', 'N/A')}")
                    print(f"   Confidence: {summary.get('confidence', 0)}%")
                    if 'recommendation' in result:
                        rec = result['recommendation']
                        print(f"   Action: {rec.get('action', 'N/A')}")
                print("   ✅ Complete analysis passed!\n")
            else:
                print(f"   ❌ Error: {response.text}\n")
        except Exception as e:
            print(f"   ❌ Exception: {e}\n")
    
    print(f"{'='*60}")
    print("✅ MCP Integration Tests Complete!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
