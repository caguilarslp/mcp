"""Test MCP Client real communication.

This script tests the REAL MCP client implementation to ensure
it can communicate with the MCP Server properly.

NO MOCKS, NO PLACEHOLDERS - REAL COMMUNICATION ONLY.
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.services.mcp import MCPClient


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_mcp_client():
    """Test MCP client with real server communication."""
    print("=" * 60)
    print("WADM MCP Client Test - REAL Communication")
    print("=" * 60)
    print()
    
    # Initialize client
    client = MCPClient()
    
    try:
        # Test 1: Health Check
        print("Test 1: Health Check")
        print("-" * 30)
        health = await client.get_health()
        print(f"✅ Health Status: {'Healthy' if health.healthy else 'Unhealthy'}")
        print(f"   Version: {health.version}")
        print(f"   Tools Count: {health.tools_count}")
        print(f"   Process Running: {health.process_running}")
        print()
        
        # Test 2: List Tools
        print("Test 2: List Available Tools")
        print("-" * 30)
        tools = await client.list_tools()
        print(f"✅ Found {len(tools)} tools")
        
        # Show first 5 tools
        for i, tool in enumerate(tools[:5]):
            print(f"   {i+1}. {tool.name} - {tool.category}")
        if len(tools) > 5:
            print(f"   ... and {len(tools) - 5} more tools")
        print()
        
        # Test 3: Call get_ticker
        print("Test 3: Get Market Data (BTCUSDT)")
        print("-" * 30)
        response = await client.call_tool(
            tool_name="get_ticker",
            params={"symbol": "BTCUSDT"}
        )
        
        if response.success:
            print("✅ Market Data Retrieved:")
            data = response.data
            print(f"   Symbol: {data.get('symbol', 'N/A')}")
            print(f"   Price: ${data.get('lastPrice', 'N/A')}")
            print(f"   24h Change: {data.get('price24hPcnt', 'N/A')}%")
            print(f"   Execution Time: {response.execution_time_ms}ms")
            print(f"   Tokens Used: {response.tokens_used}")
        else:
            print(f"❌ Error: {response.error.message}")
        print()
        
        # Test 4: Wyckoff Analysis
        print("Test 4: Wyckoff Analysis (BTCUSDT)")
        print("-" * 30)
        response = await client.call_tool(
            tool_name="analyze_wyckoff_phase",
            params={
                "symbol": "BTCUSDT",
                "timeframe": "60"
            }
        )
        
        if response.success:
            print("✅ Wyckoff Analysis:")
            data = response.data
            print(f"   Phase: {data.get('phase', 'Unknown')}")
            print(f"   Confidence: {data.get('confidence', 0)}%")
            print(f"   Bias: {data.get('bias', 'neutral')}")
            print(f"   Execution Time: {response.execution_time_ms}ms")
        else:
            print(f"❌ Error: {response.error.message}")
        print()
        
        # Test 5: Complete Analysis
        print("Test 5: Complete Analysis (BTCUSDT)")
        print("-" * 30)
        response = await client.call_tool(
            tool_name="get_complete_analysis",
            params={
                "symbol": "BTCUSDT",
                "investment": 10000
            }
        )
        
        if response.success:
            print("✅ Complete Analysis Retrieved")
            print(f"   Data Keys: {list(response.data.keys())}")
            print(f"   Execution Time: {response.execution_time_ms}ms")
            print(f"   Tokens Used: {response.tokens_used}")
        else:
            print(f"❌ Error: {response.error.message}")
        
    except FileNotFoundError as e:
        print()
        print("❌ ERROR: MCP Server not built!")
        print(f"   {e}")
        print()
        print("📌 To fix this:")
        print("   1. cd mcp_server")
        print("   2. npm install")
        print("   3. npm run build")
        print()
        print("Or run: scripts\\build-mcp.bat")
        
    except Exception as e:
        print()
        print(f"❌ Unexpected Error: {e}")
        logger.error("Test failed", exc_info=True)
        
    finally:
        # Clean up
        await client.close()
        print()
        print("=" * 60)
        print("Test Complete")
        print("=" * 60)


if __name__ == "__main__":
    # Run test
    asyncio.run(test_mcp_client())
