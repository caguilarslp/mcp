#!/usr/bin/env python
"""
Quick status check for WADM
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.storage import StorageManager
from src.logger import get_logger

logger = get_logger(__name__)

def check_status():
    """Check system status"""
    try:
        storage = StorageManager()
        stats = storage.get_stats()
        
        print("\n=== WADM Status ===")
        print(f"Trades: {stats['trades_count']}")
        print(f"Volume Profiles: {stats['volume_profiles_count']}")
        print(f"Order Flows: {stats['order_flows_count']}")
        print(f"DB Size: {stats['db_stats']['dataSize'] / 1024 / 1024:.2f} MB")
        
        # Get latest indicators
        print("\n=== Latest Indicators ===")
        for symbol in ["BTCUSDT", "ETHUSDT"]:
            for exchange in ["bybit", "binance"]:
                vp = storage.get_latest_volume_profile(symbol, exchange)
                of = storage.get_latest_order_flow(symbol, exchange)
                
                if vp or of:
                    print(f"\n{exchange.upper()} - {symbol}:")
                    if vp:
                        print(f"  Volume Profile: POC={vp['poc']:.2f}, "
                              f"VAH={vp['vah']:.2f}, VAL={vp['val']:.2f}")
                    if of:
                        print(f"  Order Flow: Delta={of['delta']:.2f}, "
                              f"Cumulative={of['cumulative_delta']:.2f}")
        
        storage.close()
        
    except Exception as e:
        print(f"Error checking status: {e}")

if __name__ == "__main__":
    check_status()
