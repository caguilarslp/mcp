#!/usr/bin/env python
"""
TASK-001: Debug indicator calculations
Quick script to test why indicators aren't calculating
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from src.storage import StorageManager
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.logger import get_logger

logger = get_logger(__name__)

def debug_indicators():
    """Debug why indicators aren't calculating"""
    print("\n=== TASK-001: Debugging Indicator Calculations ===")
    
    storage = StorageManager()
    
    # Get stats first
    stats = storage.get_stats()
    print(f"\nCurrent DB Stats:")
    print(f"  Trades: {stats['trades_count']}")
    print(f"  Volume Profiles: {stats['volume_profiles_count']}")
    print(f"  Order Flows: {stats['order_flows_count']}")
    
    # Test symbols and exchanges
    test_combinations = [
        ("BTCUSDT", "bybit"),
        ("BTCUSDT", "binance"),
        ("ETHUSDT", "bybit"),
        ("ETHUSDT", "binance")
    ]
    
    for symbol, exchange in test_combinations:
        print(f"\n--- Testing {symbol} on {exchange} ---")
        
        # Get recent trades (last 30 minutes to be sure)
        trades = storage.get_recent_trades(symbol, exchange, minutes=30)
        print(f"Trades found (30min): {len(trades)}")
        
        if trades:
            # Show sample trade
            sample = trades[0]
            print(f"Sample trade: {sample}")
            
            # Check trade format
            required_fields = ['price', 'quantity', 'side', 'timestamp']
            valid_trades = []
            
            for i, trade in enumerate(trades[:10]):  # Check first 10
                missing = [f for f in required_fields if f not in trade]
                if missing:
                    print(f"  Trade {i}: Missing fields: {missing}")
                else:
                    valid_trades.append(trade)
                    if i == 0:  # Show first valid trade details
                        print(f"  Valid trade format: price={trade['price']}, qty={trade['quantity']}, side={trade['side']}")
            
            print(f"Valid trades: {len(valid_trades)}/{len(trades[:10])} (first 10 checked)")
            
            # Try to calculate indicators if we have enough valid trades
            if len(trades) >= 50:
                print("\n  Attempting Volume Profile calculation...")
                try:
                    # Ensure all trades have correct format
                    formatted_trades = []
                    for trade in trades:
                        if all(f in trade for f in required_fields):
                            # Ensure numeric types
                            formatted_trade = {
                                'price': float(trade['price']),
                                'quantity': float(trade['quantity']),
                                'side': trade['side'],
                                'timestamp': trade['timestamp']
                            }
                            formatted_trades.append(formatted_trade)
                    
                    if len(formatted_trades) >= 50:
                        vp = VolumeProfileCalculator.calculate(formatted_trades[:100], symbol, exchange)
                        print(f"  ✅ Volume Profile: POC={vp.poc:.2f}, VAH={vp.vah:.2f}, VAL={vp.val:.2f}")
                        
                        # Save it
                        storage.save_volume_profile(vp)
                        print("  ✅ Volume Profile saved to database")
                    else:
                        print(f"  ❌ Not enough formatted trades: {len(formatted_trades)}")
                        
                except Exception as e:
                    print(f"  ❌ Volume Profile error: {e}")
                    import traceback
                    traceback.print_exc()
                
                print("\n  Attempting Order Flow calculation...")
                try:
                    of_calc = OrderFlowCalculator()
                    of = of_calc.calculate(formatted_trades[:100], symbol, exchange)
                    print(f"  ✅ Order Flow: Delta={of.delta:.2f}, Cumulative={of.cumulative_delta:.2f}")
                    
                    # Save it
                    storage.save_order_flow(of)
                    print("  ✅ Order Flow saved to database")
                    
                except Exception as e:
                    print(f"  ❌ Order Flow error: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"  ❌ Not enough trades for indicators: {len(trades)} < 50")
    
    # Check if we now have indicators
    print(f"\n=== Final Stats ===")
    final_stats = storage.get_stats()
    print(f"Trades: {final_stats['trades_count']}")
    print(f"Volume Profiles: {final_stats['volume_profiles_count']}")
    print(f"Order Flows: {final_stats['order_flows_count']}")
    
    # Show latest indicators
    print(f"\n=== Latest Indicators ===")
    for symbol, exchange in test_combinations:
        vp = storage.get_latest_volume_profile(symbol, exchange)
        of = storage.get_latest_order_flow(symbol, exchange)
        
        if vp or of:
            print(f"\n{exchange.upper()} - {symbol}:")
            if vp:
                print(f"  Volume Profile: POC={vp['poc']:.2f}, VAH={vp['vah']:.2f}, VAL={vp['val']:.2f}")
                print(f"    Timestamp: {vp['timestamp']}")
            if of:
                print(f"  Order Flow: Delta={of['delta']:.2f}, Cumulative={of['cumulative_delta']:.2f}")
                print(f"    Timestamp: {of['timestamp']}")
    
    storage.close()
    print("\n=== Debug Complete ===")

if __name__ == "__main__":
    debug_indicators()
