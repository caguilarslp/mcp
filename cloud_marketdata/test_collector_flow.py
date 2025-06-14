"""
Test script to verify WebSocket data flow
"""

import asyncio
import json
import websockets
from datetime import datetime


async def test_bybit_raw():
    """Test raw Bybit WebSocket connection"""
    url = "wss://stream.bybit.com/v5/public/spot"
    
    print(f"[{datetime.now()}] Connecting to Bybit WebSocket...")
    
    async with websockets.connect(url) as websocket:
        print(f"[{datetime.now()}] Connected! Subscribing to BTCUSDT trades...")
        
        # Subscribe to trades
        subscribe_msg = {
            "op": "subscribe",
            "args": ["publicTrade.BTCUSDT"]
        }
        await websocket.send(json.dumps(subscribe_msg))
        print(f"[{datetime.now()}] Subscription sent")
        
        # Receive messages
        trade_count = 0
        while trade_count < 10:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                
                # Handle subscription confirmation
                if data.get("op") == "subscribe":
                    print(f"[{datetime.now()}] Subscription confirmed: {data}")
                    continue
                
                # Handle trade data
                if "topic" in data and data["topic"] == "publicTrade.BTCUSDT":
                    trade_count += 1
                    trades = data.get("data", [])
                    for trade in trades:
                        print(f"[{datetime.now()}] Trade #{trade_count}: "
                              f"Side={trade['S']}, Price={trade['p']}, "
                              f"Qty={trade['v']}, Time={trade['T']}")
                
            except Exception as e:
                print(f"[{datetime.now()}] Error: {e}")
                break
        
        print(f"[{datetime.now()}] Test complete - received {trade_count} trades")


async def test_storage_direct():
    """Test storage handler directly"""
    from src.collectors.storage import InMemoryStorage
    from src.entities.trade import Trade, TradeSide
    from decimal import Decimal
    
    print("\n[Storage Test] Creating storage handler...")
    storage = InMemoryStorage()
    
    # Create test trades
    for i in range(5):
        trade = Trade(
            symbol="BTCUSDT",
            side=TradeSide.BUY if i % 2 == 0 else TradeSide.SELL,
            price=Decimal("45000") + Decimal(i * 100),
            quantity=Decimal("0.1"),
            timestamp=datetime.now(),
            exchange="test",
            trade_id=f"test_{i}"
        )
        
        print(f"[Storage Test] Storing trade {i}: {trade.price}")
        await storage.store_trade(trade)
    
    # Get stats
    stats = await storage.get_stats()
    print(f"\n[Storage Test] Stats: {stats}")
    
    # Get recent trades
    trades = await storage.get_recent_trades(limit=10)
    print(f"\n[Storage Test] Retrieved {len(trades)} trades")
    for t in trades:
        print(f"  - {t.symbol} {t.side.value} {t.price}")


async def test_full_flow():
    """Test the full collector flow"""
    from src.collectors.manager import CollectorManager
    
    print("\n[Full Flow Test] Creating collector manager...")
    manager = CollectorManager()
    
    # Start manager
    print("[Full Flow Test] Starting manager...")
    await manager.start()
    
    # Wait for some trades
    print("[Full Flow Test] Waiting 10 seconds for trades...")
    await asyncio.sleep(10)
    
    # Check stats
    collector_status = manager.get_collector_status("bybit_trades")
    print(f"\n[Full Flow Test] Collector status: {collector_status}")
    
    storage_stats = await manager.get_storage_stats()
    print(f"\n[Full Flow Test] Storage stats: {storage_stats}")
    
    # Get trades
    trades = await manager.get_recent_trades(limit=5)
    print(f"\n[Full Flow Test] Recent trades: {len(trades)} found")
    for trade in trades:
        print(f"  - {trade}")
    
    # Stop manager
    print("\n[Full Flow Test] Stopping manager...")
    await manager.stop()


async def main():
    """Run all tests"""
    print("=== Testing Bybit WebSocket Data Flow ===\n")
    
    # Test 1: Raw WebSocket
    print("1. Testing raw WebSocket connection...")
    await test_bybit_raw()
    
    # Test 2: Storage directly
    print("\n2. Testing storage handler directly...")
    await test_storage_direct()
    
    # Test 3: Full flow
    print("\n3. Testing full collector flow...")
    await test_full_flow()


if __name__ == "__main__":
    asyncio.run(main())
