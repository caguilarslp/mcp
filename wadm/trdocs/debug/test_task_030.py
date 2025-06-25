"""
Test Market Data Endpoints
Comprehensive testing for TASK-030 new endpoints
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
import websockets

# API Configuration
BASE_URL = "http://localhost:8000"
API_KEY = "wadm_master_2024"  # Master key for testing
HEADERS = {"X-API-Key": API_KEY}

async def test_enhanced_candles():
    """Test enhanced candles endpoint with new features"""
    print("\n🕯️ Testing Enhanced Candles Endpoint...")
    
    async with aiohttp.ClientSession() as session:
        # Test basic candles
        url = f"{BASE_URL}/api/v1/market/candles/BTCUSDT/1h"
        params = {"limit": 10}
        
        async with session.get(url, headers=HEADERS, params=params) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Enhanced candles: {len(data)} candles retrieved")
                
                if data:
                    candle = data[0]
                    print(f"   First candle: {candle.get('timestamp')} OHLC: {candle.get('open')}/{candle.get('high')}/{candle.get('low')}/{candle.get('close')}")
                    print(f"   Volume: {candle.get('volume')}, Trades: {candle.get('trades')}")
                    if candle.get('buy_volume'):
                        print(f"   Buy Volume: {candle.get('buy_volume')}, Sell Volume: {candle.get('sell_volume')}")
            else:
                print(f"❌ Enhanced candles failed: {response.status}")
                print(await response.text())


async def test_orderbook_simulation():
    """Test orderbook simulation endpoint"""
    print("\n📊 Testing Orderbook Simulation...")
    
    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/api/v1/market/orderbook/BTCUSDT"
        params = {"exchange": "bybit", "depth": 10}
        
        async with session.get(url, headers=HEADERS, params=params) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Orderbook simulation successful")
                print(f"   Symbol: {data.get('symbol')}, Exchange: {data.get('exchange')}")
                print(f"   Bids: {len(data.get('bids', []))}, Asks: {len(data.get('asks', []))}")
                
                if data.get('bids') and data.get('asks'):
                    best_bid = data['bids'][0]
                    best_ask = data['asks'][0]
                    print(f"   Best Bid: {best_bid.get('price')} ({best_bid.get('quantity')})")
                    print(f"   Best Ask: {best_ask.get('price')} ({best_ask.get('quantity')})")
                    print(f"   Spread: {data.get('spread')}, Mid: {data.get('mid_price')}")
            else:
                print(f"❌ Orderbook simulation failed: {response.status}")
                print(await response.text())


async def test_multi_symbol_stats():
    """Test multi-symbol stats endpoint"""
    print("\n📈 Testing Multi-Symbol Stats...")
    
    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/api/v1/market/stats/multi"
        params = {
            "symbols": "BTCUSDT,ETHUSDT,ADAUSDT",
            "timeframe": "1d"
        }
        
        async with session.get(url, headers=HEADERS, params=params) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Multi-symbol stats successful")
                
                for symbol, stats in data.items():
                    if stats:
                        print(f"   {symbol}: ${stats.get('close')} ({stats.get('change_percent', 0):.2f}%)")
                        print(f"     Volume: {stats.get('volume')}, Trades: {stats.get('trades')}")
                    else:
                        print(f"   {symbol}: No data available")
            else:
                print(f"❌ Multi-symbol stats failed: {response.status}")
                print(await response.text())


async def test_websocket_trades():
    """Test WebSocket trades streaming"""
    print("\n🔌 Testing WebSocket Trades Streaming...")
    
    try:
        # Connect to WebSocket
        uri = f"ws://localhost:8000/api/v1/market/ws/trades"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected")
            
            # Subscribe to BTCUSDT trades
            subscribe_msg = {
                "action": "subscribe",
                "symbol": "BTCUSDT"
            }
            await websocket.send(json.dumps(subscribe_msg))
            print("📤 Sent subscription for BTCUSDT")
            
            # Listen for messages (with timeout)
            try:
                for i in range(3):  # Listen for 3 messages max
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    
                    if data.get("type") == "status":
                        print(f"✅ Status: {data.get('message')}")
                    elif data.get("type") == "trade":
                        trade = data.get("data", {})
                        print(f"📊 Trade: {trade.get('symbol')} @ {trade.get('price')} ({trade.get('side')})")
                    else:
                        print(f"📨 Message: {data}")
                        
            except asyncio.TimeoutError:
                print("⏰ WebSocket timeout (normal for testing)")
                
            # Test ping
            ping_msg = {"action": "ping"}
            await websocket.send(json.dumps(ping_msg))
            
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                pong_data = json.loads(response)
                if pong_data.get("type") == "pong":
                    print("✅ Ping/Pong successful")
            except asyncio.TimeoutError:
                print("⏰ Ping timeout")
                
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")


async def test_enhanced_market_stats():
    """Test enhanced market stats with new fields"""
    print("\n📊 Testing Enhanced Market Stats...")
    
    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/api/v1/market/stats/BTCUSDT"
        params = {"timeframe": "1d"}
        
        async with session.get(url, headers=HEADERS, params=params) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Enhanced market stats successful")
                print(f"   Symbol: {data.get('symbol')}")
                print(f"   Price: ${data.get('close')} (Open: ${data.get('open')})")
                print(f"   Change: ${data.get('change', 0)} ({data.get('change_percent', 0):.2f}%)")
                print(f"   Volume: {data.get('volume')}, VWAP: ${data.get('vwap')}")
                print(f"   Trades: {data.get('trades')}")
                print(f"   Period: {data.get('start_time')} to {data.get('end_time')}")
            else:
                print(f"❌ Enhanced market stats failed: {response.status}")
                print(await response.text())


async def test_symbols_endpoint():
    """Test enhanced symbols endpoint"""
    print("\n🔖 Testing Enhanced Symbols Endpoint...")
    
    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/api/v1/market/symbols"
        
        async with session.get(url, headers=HEADERS) as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Symbols endpoint successful: {len(data)} symbols")
                
                # Show first few symbols with details
                for symbol in data[:3]:
                    print(f"   {symbol.get('symbol')} ({symbol.get('category')})")
                    print(f"     Base: {symbol.get('base_asset')}, Quote: {symbol.get('quote_asset')}")
                    print(f"     Exchanges: {', '.join(symbol.get('exchanges', []))}")
                    
                # Test category filter
                params = {"category": "ai"}
                async with session.get(url, headers=HEADERS, params=params) as response2:
                    if response2.status == 200:
                        ai_data = await response2.json()
                        print(f"✅ Category filter (AI): {len(ai_data)} symbols")
            else:
                print(f"❌ Symbols endpoint failed: {response.status}")


async def test_performance_metrics():
    """Test API performance and response times"""
    print("\n⚡ Testing Performance Metrics...")
    
    async with aiohttp.ClientSession() as session:
        # Test multiple endpoints for performance
        endpoints = [
            ("/api/v1/market/candles/BTCUSDT/1h", {"limit": 50}),
            ("/api/v1/market/stats/BTCUSDT", {"timeframe": "1d"}),
            ("/api/v1/market/symbols", {}),
            ("/api/v1/market/trades/BTCUSDT", {"per_page": 20})
        ]
        
        for endpoint, params in endpoints:
            start_time = datetime.now()
            
            async with session.get(f"{BASE_URL}{endpoint}", headers=HEADERS, params=params) as response:
                end_time = datetime.now()
                response_time = (end_time - start_time).total_seconds() * 1000
                
                if response.status == 200:
                    print(f"✅ {endpoint}: {response_time:.0f}ms")
                else:
                    print(f"❌ {endpoint}: {response.status} ({response_time:.0f}ms)")


async def main():
    """Run all tests"""
    print("🚀 TASK-030 Market Data Endpoints Testing")
    print("=" * 50)
    
    # Test all endpoints
    await test_enhanced_candles()
    await test_orderbook_simulation()
    await test_multi_symbol_stats()
    await test_enhanced_market_stats()
    await test_symbols_endpoint()
    await test_performance_metrics()
    await test_websocket_trades()
    
    print("\n🏁 All tests completed!")
    print("\nNEXT STEPS:")
    print("1. Check Swagger UI: http://localhost:8000/api/docs")
    print("2. Test WebSocket client in browser console")
    print("3. Ready for TASK-031: Indicators API Endpoints")


if __name__ == "__main__":
    asyncio.run(main())
