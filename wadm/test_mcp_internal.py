"""
Simple script to test MCP without authentication.
Run this inside the API container for debugging.
"""

import asyncio
import httpx
import json

async def test_mcp():
    print("Testing MCP Server directly...")
    
    # Test direct connection to MCP wrapper
    async with httpx.AsyncClient() as client:
        try:
            # Test health
            print("\n1. Testing MCP health...")
            response = await client.get("http://mcp-server:3000/health")
            print(f"Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            
            # Test tools list
            print("\n2. Testing tools list...")
            response = await client.get("http://mcp-server:3000/mcp/tools")
            data = response.json()
            tools = data.get("tools", [])
            print(f"Total tools: {len(tools)}")
            for i, tool in enumerate(tools[:5]):
                print(f"  {i+1}. {tool['name']}")
            
            # Test a tool call
            print("\n3. Testing get_ticker...")
            response = await client.post(
                "http://mcp-server:3000/mcp/call",
                json={
                    "method": "tools/call",
                    "params": {
                        "name": "get_ticker",
                        "arguments": {"symbol": "BTCUSDT"}
                    }
                }
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print(f"Response: {json.dumps(response.json(), indent=2)[:500]}...")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp())
