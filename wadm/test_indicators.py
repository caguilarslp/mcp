#!/usr/bin/env python
"""
Test indicator calculations with sample data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
import random
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.logger import get_logger

logger = get_logger(__name__)

def generate_test_trades(n=100, symbol="BTCUSDT", exchange="bybit"):
    """Generate test trades"""
    trades = []
    base_price = 45000
    current_time = datetime.utcnow()
    
    for i in range(n):
        # Random walk price
        price_change = random.uniform(-50, 50)
        price = base_price + price_change
        
        # Random quantity
        quantity = random.uniform(0.001, 0.5)
        
        # Random side with slight buy bias
        side = "buy" if random.random() > 0.45 else "sell"
        
        # Time going backwards
        timestamp = current_time - timedelta(seconds=i)
        
        trades.append({
            "price": price,
            "quantity": quantity,
            "side": side,
            "timestamp": timestamp,
            "trade_id": f"test_{i}",
            "exchange": exchange,
            "symbol": symbol
        })
    
    return trades

def test_indicators():
    """Test indicator calculations"""
    print("\n=== Testing Indicator Calculations ===\n")
    
    # Generate test data
    trades = generate_test_trades(100)
    print(f"Generated {len(trades)} test trades")
    print(f"Price range: {min(t['price'] for t in trades):.2f} - {max(t['price'] for t in trades):.2f}")
    print(f"Total volume: {sum(t['quantity'] for t in trades):.4f} BTC")
    
    # Test Volume Profile
    print("\n--- Testing Volume Profile ---")
    try:
        vp = VolumeProfileCalculator.calculate(trades, "BTCUSDT", "bybit")
        print(f"✓ Success!")
        print(f"  POC: ${vp.poc:.2f}")
        print(f"  VAH: ${vp.vah:.2f}")
        print(f"  VAL: ${vp.val:.2f}")
        print(f"  Total Volume: {vp.total_volume:.4f} BTC")
        print(f"  Price Levels: {len(vp.volume_distribution)}")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test Order Flow
    print("\n--- Testing Order Flow ---")
    try:
        calc = OrderFlowCalculator()
        of = calc.calculate(trades, "BTCUSDT", "bybit")
        print(f"✓ Success!")
        print(f"  Buy Volume: {of.buy_volume:.4f} BTC")
        print(f"  Sell Volume: {of.sell_volume:.4f} BTC")
        print(f"  Delta: {of.delta:.4f} BTC")
        print(f"  Cumulative Delta: {of.cumulative_delta:.4f} BTC")
        print(f"  Imbalance Ratio: {of.imbalance_ratio:.2f}")
        print(f"  Large Trades: {of.large_trades_count}")
        print(f"  Absorption Detected: {of.absorption_detected}")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test with minimal data
    print("\n--- Testing with minimal data (10 trades) ---")
    small_trades = generate_test_trades(10)
    
    try:
        vp = VolumeProfileCalculator.calculate(small_trades, "BTCUSDT", "bybit")
        print(f"✓ Volume Profile works with {len(small_trades)} trades")
    except Exception as e:
        print(f"✗ Volume Profile error: {e}")
    
    try:
        calc = OrderFlowCalculator()
        of = calc.calculate(small_trades, "BTCUSDT", "bybit")
        print(f"✓ Order Flow works with {len(small_trades)} trades")
    except Exception as e:
        print(f"✗ Order Flow error: {e}")

if __name__ == "__main__":
    test_indicators()
