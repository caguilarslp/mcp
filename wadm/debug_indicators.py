#!/usr/bin/env python3
"""
Debug script for TASK-001: Indicators not calculating
"""
import asyncio
from datetime import datetime, timezone
from src.storage import StorageManager
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.logger import get_logger
import json

logger = get_logger(__name__)

async def debug_indicators():
    """Debug indicator calculation issues"""
    storage = StorageManager()
    
    print("\n=== WADM Indicator Debug ===\n")
    
    # 1. Check database stats
    stats = storage.get_stats()
    print(f"📊 Database Stats:")
    print(f"   - Trades: {stats['trades_count']}")
    print(f"   - Volume Profiles: {stats['volume_profiles_count']}")
    print(f"   - Order Flows: {stats['order_flows_count']}")
    print(f"   - SMC Analyses: {stats['smc_analyses_count']}")
    
    # 2. Get a sample of trades
    symbol = "BTCUSDT"
    exchange = "bybit"
    
    print(f"\n🔍 Checking trades for {symbol}/{exchange}...")
    
    # Get recent trades
    trades = storage.get_recent_trades(symbol, exchange, minutes=10)
    print(f"   - Found {len(trades)} trades in last 10 minutes")
    
    if trades:
        # Show sample trade structure
        print(f"\n📋 Sample trade structure:")
        sample = trades[0]
        for key, value in sample.items():
            if key != "_id":
                print(f"   - {key}: {value} ({type(value).__name__})")
        
        # Check field mapping issue
        print(f"\n⚠️  Field Mapping Check:")
        print(f"   - Has 'price': {'price' in sample}")
        print(f"   - Has 'quantity': {'quantity' in sample}")
        print(f"   - Has 'size': {'size' in sample}")  # MongoDB might use 'size' instead
        print(f"   - Has 'side': {'side' in sample}")
        print(f"   - Has 'timestamp': {'timestamp' in sample}")
        
        # Try to calculate indicators with proper field mapping
        print(f"\n🧪 Testing Volume Profile calculation...")
        
        # Fix field mapping
        valid_trades = []
        for trade in trades[:100]:  # Use first 100 trades
            try:
                # Map fields correctly - MongoDB stores 'quantity' not 'size'
                formatted_trade = {
                    'price': float(trade.get('price', 0)),
                    'quantity': float(trade.get('quantity', 0)),  # Use 'quantity' field
                    'side': str(trade.get('side', '')).lower(),
                    'timestamp': trade.get('timestamp')
                }
                
                # Validate
                if (formatted_trade['price'] > 0 and 
                    formatted_trade['quantity'] > 0 and 
                    formatted_trade['side'] in ['buy', 'sell']):
                    valid_trades.append(formatted_trade)
                    
            except Exception as e:
                print(f"   ❌ Error formatting trade: {e}")
        
        print(f"   - Valid trades: {len(valid_trades)}/{len(trades[:100])}")
        
        if len(valid_trades) >= 20:
            try:
                vp = VolumeProfileCalculator.calculate(valid_trades, symbol, exchange)
                print(f"   ✅ Volume Profile calculated!")
                print(f"      - POC: ${vp.poc:.2f}")
                print(f"      - VAH: ${vp.vah:.2f}")
                print(f"      - VAL: ${vp.val:.2f}")
                print(f"      - Total Volume: {vp.total_volume:.2f}")
                
                # Save it
                storage.save_volume_profile(vp)
                print(f"   ✅ Volume Profile saved!")
                
            except Exception as e:
                print(f"   ❌ Volume Profile calculation failed: {e}")
                import traceback
                traceback.print_exc()
        
        # Test Order Flow
        print(f"\n🧪 Testing Order Flow calculation...")
        
        try:
            of_calc = OrderFlowCalculator()
            prev_flow = storage.get_latest_order_flow(symbol, exchange)
            
            of = of_calc.calculate(valid_trades[:50], symbol, exchange, prev_flow)
            print(f"   ✅ Order Flow calculated!")
            print(f"      - Delta: {of.delta:.2f}")
            print(f"      - Cumulative Delta: {of.cumulative_delta:.2f}")
            print(f"      - Buy Volume: {of.buy_volume:.2f}")
            print(f"      - Sell Volume: {of.sell_volume:.2f}")
            print(f"      - Momentum Score: {of.momentum_score:.2f}")
            
            # Save it
            storage.save_order_flow(of)
            print(f"   ✅ Order Flow saved!")
            
        except Exception as e:
            print(f"   ❌ Order Flow calculation failed: {e}")
            import traceback
            traceback.print_exc()
    
    else:
        print(f"   ❌ No trades found! Check collectors are running.")
    
    # 3. Check all symbols
    print(f"\n📊 Checking all symbols...")
    
    symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]
    exchanges = ["bybit", "binance"]
    
    for symbol in symbols:
        for exchange in exchanges:
            trades_count = len(storage.get_recent_trades(symbol, exchange, minutes=5))
            vp = storage.get_latest_volume_profile(symbol, exchange)
            of = storage.get_latest_order_flow(symbol, exchange)
            
            vp_age = "Never"
            if vp and 'timestamp' in vp:
                age = (datetime.now(timezone.utc) - vp['timestamp']).total_seconds() / 60
                vp_age = f"{age:.1f} min ago"
            
            of_age = "Never"
            if of and 'timestamp' in of:
                age = (datetime.now(timezone.utc) - of['timestamp']).total_seconds() / 60
                of_age = f"{age:.1f} min ago"
            
            print(f"   {symbol}/{exchange}: {trades_count} trades, VP: {vp_age}, OF: {of_age}")
    
    print(f"\n✅ Debug complete!")
    
    storage.close()

if __name__ == "__main__":
    asyncio.run(debug_indicators())
