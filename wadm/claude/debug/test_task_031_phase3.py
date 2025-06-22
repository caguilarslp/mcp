"""
Test script for TASK-031 Phase 3: API Key Management + SMC Integration
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Base URL
BASE_URL = "http://localhost:8000/api/v1"

# Master key for testing
MASTER_KEY = "wadm-master-key-2024"


async def test_api_key_management():
    """Test API key management endpoints."""
    print("\n" + "="*60)
    print("Testing API Key Management System")
    print("="*60)
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Create new API key
        print("\n1. Creating new API key...")
        headers = {"X-API-Key": MASTER_KEY}
        data = {
            "name": "Test Trading Bot",
            "permissions": ["read", "write"],
            "expires_at": None
        }
        
        new_key = None
        key_id = None
        
        try:
            async with session.post(
                f"{BASE_URL}/auth/keys",
                headers=headers,
                json=data
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ API Key created successfully!")
                    print(f"   Key ID: {result['id']}")
                    print(f"   Key: {result['key']}")
                    print(f"   Name: {result['name']}")
                    new_key = result['key']
                    key_id = result['id']
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error creating key: {e}")
        
        # Test 2: List API keys
        print("\n2. Listing API keys...")
        try:
            async with session.get(
                f"{BASE_URL}/auth/keys",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ Found {result['total']} API keys")
                    for key in result['keys'][:3]:  # Show first 3
                        print(f"   - {key['name']} (ID: {key['id']}, Active: {key['active']})")
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error listing keys: {e}")
        
        # Test 3: Verify the new key
        if new_key:
            print("\n3. Verifying new API key...")
            headers_new = {"X-API-Key": new_key}
            try:
                async with session.get(
                    f"{BASE_URL}/auth/keys/verify",
                    headers=headers_new
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Key verified successfully!")
                        print(f"   Valid: {result['valid']}")
                        print(f"   Permissions: {result['permissions']}")
                    else:
                        print(f"❌ Failed: {resp.status} - {await resp.text()}")
            except Exception as e:
                print(f"❌ Error verifying key: {e}")
        
        # Test 4: Get specific key details
        if key_id:
            print(f"\n4. Getting details for key {key_id}...")
            try:
                async with session.get(
                    f"{BASE_URL}/auth/keys/{key_id}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Key details retrieved!")
                        print(f"   Name: {result['name']}")
                        print(f"   Created: {result['created_at']}")
                        print(f"   Last Used: {result.get('last_used', 'Never')}")
                    else:
                        print(f"❌ Failed: {resp.status} - {await resp.text()}")
            except Exception as e:
                print(f"❌ Error getting key details: {e}")
        
        # Test 5: Revoke the key
        if key_id:
            print(f"\n5. Revoking key {key_id}...")
            try:
                async with session.delete(
                    f"{BASE_URL}/auth/keys/{key_id}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Key revoked successfully!")
                        print(f"   {result['message']}")
                    else:
                        print(f"❌ Failed: {resp.status} - {await resp.text()}")
            except Exception as e:
                print(f"❌ Error revoking key: {e}")
        
        return new_key


async def test_smc_endpoints(api_key: str = None):
    """Test SMC endpoints with proper authentication."""
    print("\n" + "="*60)
    print("Testing SMC Endpoints")
    print("="*60)
    
    # Use provided key or master key
    test_key = api_key or MASTER_KEY
    headers = {"X-API-Key": test_key}
    
    async with aiohttp.ClientSession() as session:
        # Test 1: SMC Analysis
        print("\n1. Testing SMC Analysis endpoint...")
        try:
            async with session.get(
                f"{BASE_URL}/indicators/smc/BTCUSDT/analysis?timeframe=15m",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ SMC Analysis retrieved successfully!")
                    print(f"   Symbol: {result['symbol']}")
                    print(f"   Timeframe: {result['timeframe']}")
                    print(f"   Order Blocks: {len(result.get('order_blocks', []))}")
                    print(f"   Fair Value Gaps: {len(result.get('fair_value_gaps', []))}")
                    print(f"   Market Bias: {result.get('market_bias', 'N/A')}")
                    print(f"   Confluence Score: {result.get('confluence_score', 0)}")
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error getting SMC analysis: {e}")
        
        # Test 2: SMC Signals
        print("\n2. Testing SMC Signals endpoint...")
        try:
            async with session.get(
                f"{BASE_URL}/indicators/smc/BTCUSDT/signals?min_confidence=70",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ SMC Signals retrieved successfully!")
                    print(f"   Active Signals: {result.get('signal_count', 0)}")
                    print(f"   Average Confidence: {result.get('average_confidence', 0):.1f}%")
                    
                    # Show first signal if available
                    if result.get('active_signals'):
                        signal = result['active_signals'][0]
                        print(f"\n   📊 Top Signal:")
                        print(f"      Type: {signal.get('signal_type', 'N/A')}")
                        print(f"      Entry: ${signal.get('entry_price', 0):,.2f}")
                        print(f"      Stop Loss: ${signal.get('stop_loss', 0):,.2f}")
                        print(f"      Confidence: {signal.get('confidence', 0):.1f}%")
                        print(f"      R:R Ratio: {signal.get('risk_reward', 0):.2f}")
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error getting SMC signals: {e}")
        
        # Test 3: Market Structure
        print("\n3. Testing Market Structure endpoint...")
        try:
            async with session.get(
                f"{BASE_URL}/indicators/smc/BTCUSDT/structure",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ Market Structure retrieved successfully!")
                    print(f"   Primary Trend: {result.get('trend', {}).get('primary', 'N/A')}")
                    print(f"   Trend Strength: {result.get('trend', {}).get('strength', 0)}")
                    print(f"   Momentum Score: {result.get('momentum', {}).get('score', 0)}")
                    print(f"   Recent Breaks: {len(result.get('recent_breaks', []))}")
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error getting market structure: {e}")
        
        # Test 4: Confluence Analysis
        print("\n4. Testing Confluence Analysis endpoint...")
        try:
            async with session.get(
                f"{BASE_URL}/indicators/smc/BTCUSDT/confluence?min_score=70",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"✅ Confluence Analysis retrieved successfully!")
                    print(f"   Total Confluences: {result.get('summary', {}).get('total_confluences', 0)}")
                    print(f"   Highest Score: {result.get('summary', {}).get('highest_score', 0)}")
                    
                    # Show top confluence if available
                    if result.get('confluences'):
                        conf = result['confluences'][0]
                        print(f"\n   🎯 Top Confluence Zone:")
                        print(f"      Price: ${conf.get('price', 0):,.2f}")
                        print(f"      Score: {conf.get('score', 0)}")
                        print(f"      Factors: {', '.join(conf.get('factors', []))}")
                else:
                    print(f"❌ Failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            print(f"❌ Error getting confluence analysis: {e}")


async def test_cross_indicator_validation():
    """Test that SMC integrates with VP and OF data."""
    print("\n" + "="*60)
    print("Testing Cross-Indicator Integration")
    print("="*60)
    
    headers = {"X-API-Key": MASTER_KEY}
    
    async with aiohttp.ClientSession() as session:
        # Get all three indicators
        print("\n1. Fetching Volume Profile...")
        vp_data = None
        try:
            async with session.get(
                f"{BASE_URL}/indicators/volume-profile/BTCUSDT?mode=latest",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    vp_data = await resp.json()
                    print(f"✅ POC: ${vp_data['poc']:,.2f}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n2. Fetching Order Flow...")
        of_data = None
        try:
            async with session.get(
                f"{BASE_URL}/indicators/order-flow/BTCUSDT?mode=latest",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    of_data = await resp.json()
                    print(f"✅ Momentum Score: {of_data['momentum_score']}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n3. Checking SMC Confluence Integration...")
        try:
            async with session.get(
                f"{BASE_URL}/indicators/smc/BTCUSDT/confluence?min_score=50",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    
                    # Check if VP levels appear in confluence
                    if vp_data and result.get('confluences'):
                        for conf in result['confluences'][:5]:
                            factors = conf.get('factors', [])
                            if any('Volume' in f for f in factors):
                                print(f"✅ Found Volume Profile integration at ${conf['price']:,.2f}")
                                break
                    
                    # Check recommendation
                    rec = result.get('summary', {}).get('recommendation', '')
                    if rec:
                        print(f"\n📌 Confluence Recommendation:")
                        print(f"   {rec}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    """Run all tests."""
    print("\n🚀 WADM TASK-031 Phase 3 Test Suite")
    print("API Key Management + SMC Integration")
    
    # Test API key management
    new_api_key = await test_api_key_management()
    
    # Test SMC endpoints with master key
    await test_smc_endpoints()
    
    # Test cross-indicator integration
    await test_cross_indicator_validation()
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
