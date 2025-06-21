#!/usr/bin/env python
"""
Debug indicator calculations
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta, timezone
from src.storage import StorageManager
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.logger import get_logger

logger = get_logger(__name__)

def debug_indicators():
    """Debug why indicators aren't calculating"""
    storage = StorageManager()
    
    print("\n=== Debugging Indicator Calculations ===")
    
    # Check for each symbol/exchange combination
    for symbol in ["BTCUSDT", "ETHUSDT"]:
        for exchange in ["bybit", "binance"]:
            print(f"\n--- {exchange.upper()} - {symbol} ---")
            
            # Check trades in different time windows
            for minutes in [1, 5, 15, 60]:
                since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
                count = storage.trades.count_documents({
                    "symbol": symbol,
                    "exchange": exchange,
                    "timestamp": {"$gte": since}
                })
                print(f"  Trades in last {minutes} min: {count}")
            
            # Get actual recent trades
            trades = storage.get_recent_trades(symbol, exchange, minutes=5)
            print(f"  Retrieved trades: {len(trades)}")
            
            if trades:
                # Show sample trade structure
                print(f"  Sample trade keys: {list(trades[0].keys())}")
                print(f"  Sample trade: {trades[0]}")
                
                # Check timestamp format
                first_ts = trades[0].get("timestamp")
                last_ts = trades[-1].get("timestamp")
                print(f"  First trade time: {first_ts}")
                print(f"  Last trade time: {last_ts}")
                
                # Check if trades have required fields
                required_fields = ['price', 'quantity', 'side', 'timestamp']
                missing_fields = [f for f in required_fields if f not in trades[0]]
                if missing_fields:
                    print(f"  WARNING: Missing fields in trade: {missing_fields}")
                
                # Try to calculate indicators
                if len(trades) >= 50:
                    print(f"  Attempting to calculate indicators...")
                    
                    try:
                        # Volume Profile
                        vp = VolumeProfileCalculator.calculate(trades, symbol, exchange)
                        print(f"  ✓ Volume Profile: POC={vp.poc:.2f}, VAH={vp.vah:.2f}, VAL={vp.val:.2f}")
                    except Exception as e:
                        print(f"  ✗ Volume Profile error: {e}")
                    
                    try:
                        # Order Flow
                        calc = OrderFlowCalculator()
                        of = calc.calculate(trades, symbol, exchange)
                        print(f"  ✓ Order Flow: Delta={of.delta:.2f}, Cumulative={of.cumulative_delta:.2f}")
                    except Exception as e:
                        print(f"  ✗ Order Flow error: {e}")
    
    storage.close()

if __name__ == "__main__":
    debug_indicators()
