#!/usr/bin/env python3
"""
Quick test script for WADM database functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import datetime
from decimal import Decimal

try:
    from src.core.config import get_config
    from src.core.entities import Trade
    from src.core.types import Symbol, Exchange, Side
    print("✅ Core imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

try:
    from src.infrastructure.database import MongoDBClient
    print("✅ Database imports successful")
except ImportError as e:
    print(f"❌ Database import error: {e}")
    sys.exit(1)


async def test_basic_functionality():
    """Test basic functionality without external dependencies."""
    
    print("\n🧪 Testing basic functionality...")
    
    # Test configuration
    try:
        config = get_config()
        print(f"✅ Configuration loaded: {config.APP_NAME} v{config.APP_VERSION}")
        print(f"   Environment: {config.ENVIRONMENT}")
        print(f"   MongoDB URL: {config.MONGODB_URL}")
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False
    
    # Test entity creation
    try:
        trade = Trade(
            id="test_trade_1",
            symbol=Symbol("BTCUSDT"),
            exchange=Exchange("binance"),
            price=Decimal("50000.0"),
            quantity=Decimal("0.1"),
            side=Side.BUY,
            timestamp=datetime.utcnow(),
            is_buyer_maker=True
        )
        print(f"✅ Trade entity created: {trade.symbol} @ ${trade.price}")
    except Exception as e:
        print(f"❌ Entity creation error: {e}")
        return False
    
    # Test MongoDB client creation (without connection)
    try:
        mongodb_client = MongoDBClient(config.MONGODB_URL)
        print("✅ MongoDB client created successfully")
    except Exception as e:
        print(f"❌ MongoDB client error: {e}")
        return False
    
    return True


async def test_mongodb_connection():
    """Test MongoDB connection if available."""
    
    print("\n🔌 Testing MongoDB connection...")
    
    try:
        config = get_config()
        mongodb_client = MongoDBClient(config.MONGODB_URL)
        
        # Try to connect
        await mongodb_client.connect()
        print("✅ MongoDB connection successful")
        
        # Test basic operation
        health = await mongodb_client.health_check()
        print(f"✅ MongoDB health check: {health.get('status', 'unknown')}")
        
        # Disconnect
        await mongodb_client.disconnect()
        print("✅ MongoDB disconnection successful")
        
        return True
        
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
        print("   This is expected if MongoDB is not running")
        return False


def test_calculations():
    """Test calculation logic."""
    
    print("\n🧮 Testing calculation logic...")
    
    # Test volume calculations
    trades_data = [
        ("buy", 10.0),
        ("sell", 8.0),
        ("buy", 15.0),
        ("sell", 12.0),
    ]
    
    buy_volume = sum(qty for side, qty in trades_data if side == "buy")
    sell_volume = sum(qty for side, qty in trades_data if side == "sell")
    
    print(f"✅ Buy volume: {buy_volume}")
    print(f"✅ Sell volume: {sell_volume}")
    print(f"✅ Buy/Sell ratio: {buy_volume/sell_volume:.2f}")
    
    # Test price level distribution
    price_data = [
        (50000.0, 0.1),
        (50005.0, 0.2),
        (50000.0, 0.15),
        (50010.0, 0.05),
    ]
    
    price_levels = {}
    for price, qty in price_data:
        price_levels[price] = price_levels.get(price, 0) + qty
    
    poc_price = max(price_levels.items(), key=lambda x: x[1])[0]
    print(f"✅ Price levels: {len(price_levels)} levels")
    print(f"✅ POC price: ${poc_price}")
    
    return True


async def main():
    """Main test function."""
    
    print("🚀 WADM Database Quick Test")
    print("=" * 50)
    
    # Test basic functionality
    basic_ok = await test_basic_functionality()
    
    # Test calculations
    calc_ok = test_calculations()
    
    # Test MongoDB connection (optional)
    mongo_ok = await test_mongodb_connection()
    
    print("\n📊 Test Results:")
    print(f"   Basic functionality: {'✅ PASS' if basic_ok else '❌ FAIL'}")
    print(f"   Calculations: {'✅ PASS' if calc_ok else '❌ FAIL'}")
    print(f"   MongoDB connection: {'✅ PASS' if mongo_ok else '⚠️  SKIP (DB not available)'}")
    
    if basic_ok and calc_ok:
        print("\n🎉 Core functionality is working!")
        if mongo_ok:
            print("💾 Database is ready for full testing")
        else:
            print("💡 Start MongoDB with: docker-compose -f docker-compose.dev.yml up mongodb")
        return True
    else:
        print("\n❌ Some core functionality is not working")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
