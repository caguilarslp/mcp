"""
Example usage of WADM MongoDB schemas and data manager.

This example demonstrates how to use the database infrastructure
for storing and retrieving market data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

from src.infrastructure.database import (
    MongoDBClient, DataManager, MongoSchemas
)
from src.core.entities import Trade, VolumeProfile, OrderFlow
from src.core.types import Symbol, Exchange, Side
from src.core.config import get_config


async def main():
    """Main example function."""
    
    # Get configuration
    config = get_config()
    
    # Initialize MongoDB client
    mongodb_client = MongoDBClient(config.MONGODB_URL)
    
    try:
        # Connect to MongoDB
        await mongodb_client.connect()
        print("✅ Connected to MongoDB")
        
        # Initialize data manager
        data_manager = DataManager(mongodb_client)
        await data_manager.initialize()
        print("✅ Data manager initialized")
        
        # Example 1: Create and save trades
        print("\n📈 Creating sample trades...")
        sample_trades = [
            Trade(
                id=f"trade_{i}",
                symbol=Symbol("BTCUSDT"),
                exchange=Exchange("binance"),
                price=Decimal(f"{50000 + i * 10}"),
                quantity=Decimal("0.1"),
                side=Side.BUY if i % 2 == 0 else Side.SELL,
                timestamp=datetime.utcnow() - timedelta(minutes=i),
                is_buyer_maker=i % 3 == 0
            )
            for i in range(10)
        ]
        
        # Save trades in batch
        trade_ids = await data_manager.save_trades_batch(sample_trades)
        print(f"✅ Saved {len(trade_ids)} trades")
        
        # Example 2: Query trades by price range
        print("\n🔍 Querying trades by price range...")
        price_range_trades = await data_manager.trades.find_by_price_range(
            Symbol("BTCUSDT"),
            Decimal("50000"),
            Decimal("50050"),
            Exchange("binance")
        )
        print(f"✅ Found {len(price_range_trades)} trades in price range")
        
        # Example 3: Get volume analysis
        print("\n📊 Analyzing volume by side...")
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        
        volume_stats = await data_manager.trades.get_volume_by_side(
            Symbol("BTCUSDT"),
            start_time,
            end_time,
            Exchange("binance")
        )
        
        print(f"📈 Buy volume: {volume_stats.get('buy_volume', 0)}")
        print(f"📉 Sell volume: {volume_stats.get('sell_volume', 0)}")
        print(f"🔄 Buy/Sell ratio: {float(volume_stats.get('buy_volume', 0)) / max(float(volume_stats.get('sell_volume', 1)), 1):.2f}")
        
        # Example 4: Create and save volume profile
        print("\n📊 Creating volume profile...")
        volume_profile = VolumeProfile(
            symbol=Symbol("BTCUSDT"),
            exchange=Exchange("binance"),
            start_time=start_time,
            end_time=end_time,
            price_levels={
                "50000.0": Decimal("15.5"),
                "50010.0": Decimal("22.3"),
                "50020.0": Decimal("18.7"),
                "50030.0": Decimal("25.1"),  # POC
                "50040.0": Decimal("12.8"),
                "50050.0": Decimal("8.9")
            },
            poc_price=Decimal("50030.0"),
            vah_price=Decimal("50045.0"),
            val_price=Decimal("50005.0"),
            total_volume=Decimal("103.3"),
            value_area_volume=Decimal("72.3")
        )
        
        vp_id = await data_manager.volume_profiles.create(volume_profile)
        print(f"✅ Created volume profile: {vp_id}")
        
        # Example 5: Create and save order flow
        print("\n🌊 Creating order flow data...")
        order_flow = OrderFlow(
            symbol=Symbol("BTCUSDT"),
            exchange=Exchange("binance"),
            timestamp=datetime.utcnow(),
            timeframe="5m",
            delta=Decimal("8.5"),
            cumulative_delta=Decimal("25.3"),
            buy_volume=Decimal("65.2"),
            sell_volume=Decimal("56.7"),
            total_volume=Decimal("121.9"),
            imbalance_ratio=Decimal("1.15"),
            large_trades_count=4,
            absorption_events=1
        )
        
        of_id = await data_manager.order_flow.create(order_flow)
        print(f"✅ Created order flow: {of_id}")
        
        # Example 6: Get comprehensive market overview
        print("\n🌍 Getting market overview...")
        market_overview = await data_manager.get_market_overview(
            Symbol("BTCUSDT"),
            Exchange("binance"),
            hours_back=1
        )
        
        print(f"📊 Market Overview for {market_overview['symbol']}:")
        print(f"   - Period: {market_overview['period_hours']} hours")
        print(f"   - Latest trades: {market_overview['latest_trades_count']}")
        print(f"   - Has volume profile: {market_overview['latest_volume_profile'] is not None}")
        print(f"   - Has order flow: {market_overview['latest_order_flow'] is not None}")
        
        # Example 7: Get database statistics
        print("\n📈 Database statistics...")
        db_stats = await data_manager.get_database_stats()
        
        if "totals" in db_stats:
            totals = db_stats["totals"]
            print(f"📊 Total documents: {totals['total_documents']}")
            print(f"💾 Total size: {totals['total_size_mb']} MB")
        
        # Example 8: Find liquidity zones
        print("\n🎯 Finding liquidity zones...")
        current_price = Decimal("50030.0")
        liquidity_zones = await data_manager.find_liquidity_zones(
            Symbol("BTCUSDT"),
            current_price,
            price_range_percent=2.0,
            exchange=Exchange("binance")
        )
        
        print(f"🎯 Liquidity zones around ${current_price}:")
        print(f"   - Support levels: {len(liquidity_zones['support_levels'])}")
        print(f"   - Resistance levels: {len(liquidity_zones['resistance_levels'])}")
        print(f"   - POC levels: {len(liquidity_zones['poc_levels'])}")
        
        # Example 9: Test price-volume distribution
        print("\n📈 Price-volume distribution...")
        pv_distribution = await data_manager.trades.get_price_volume_distribution(
            Symbol("BTCUSDT"),
            start_time,
            end_time,
            Decimal("10.0"),  # $10 buckets
            Exchange("binance")
        )
        
        print(f"📊 Price-volume distribution (${len(pv_distribution)} price levels):")
        for price, volume in sorted(pv_distribution.items())[:5]:  # Show top 5
            print(f"   - ${price}: {volume} volume")
        
        print("\n✅ Example completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise
    
    finally:
        # Clean up
        await data_manager.close()
        print("🔚 Data manager closed")


async def setup_example():
    """Setup function to ensure database is ready."""
    
    config = get_config()
    mongodb_client = MongoDBClient(config.MONGODB_URL)
    
    try:
        await mongodb_client.connect()
        
        # Create all schemas if they don't exist
        await MongoSchemas.create_all_schemas(mongodb_client.db)
        print("✅ Database schemas ensured")
        
        # Get collection info
        collection_info = await MongoSchemas.get_collection_info(mongodb_client.db)
        print(f"📊 Collections available: {list(collection_info.keys())}")
        
    finally:
        await mongodb_client.disconnect()


if __name__ == "__main__":
    print("🚀 WADM Database Example")
    print("=" * 50)
    
    # Setup database first
    print("🔧 Setting up database...")
    asyncio.run(setup_example())
    
    print("\n🎯 Running example...")
    asyncio.run(main())
