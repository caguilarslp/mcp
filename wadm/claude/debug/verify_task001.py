#!/usr/bin/env python
"""
TASK-001 Verification: Test the fixes applied to indicator calculations
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from src.storage import StorageManager
from src.logger import get_logger

logger = get_logger(__name__)

def verify_task001_fix():
    """Verify that TASK-001 fixes are working"""
    print("\n=== TASK-001 VERIFICATION ===")
    print("Checking if indicator calculation fixes are working...")
    
    storage = StorageManager()
    
    try:
        # Get current stats
        stats = storage.get_stats()
        print(f"\nCurrent Database Stats:")
        print(f"  Trades: {stats['trades_count']}")
        print(f"  Volume Profiles: {stats['volume_profiles_count']}")
        print(f"  Order Flows: {stats['order_flows_count']}")
        
        if stats['volume_profiles_count'] == 0 and stats['order_flows_count'] == 0:
            print("\n⚠️  No indicators found yet - system may need to be restarted")
            print("   Run: python main.py")
            print("   Wait 30-60 seconds, then run this script again")
            return
        
        # Check for recent indicators (last 5 minutes)
        recent_indicators = False
        cutoff_time = datetime.now(timezone.utc)
        
        symbols_exchanges = [
            ("BTCUSDT", "bybit"),
            ("BTCUSDT", "binance"),
            ("ETHUSDT", "bybit"),
            ("ETHUSDT", "binance")
        ]
        
        print(f"\n=== Latest Indicators ===")
        
        for symbol, exchange in symbols_exchanges:
            # Check Volume Profile
            vp = storage.get_latest_volume_profile(symbol, exchange)
            of = storage.get_latest_order_flow(symbol, exchange)
            
            print(f"\n{exchange.upper()} - {symbol}:")
            
            if vp:
                vp_time = vp['timestamp']
                if isinstance(vp_time, str):
                    vp_time = datetime.fromisoformat(vp_time.replace('Z', '+00:00'))
                elif vp_time.tzinfo is None:
                    vp_time = vp_time.replace(tzinfo=timezone.utc)
                
                age_minutes = (cutoff_time - vp_time).total_seconds() / 60
                
                print(f"  Volume Profile: POC=${vp['poc']:.2f}, VAH=${vp['vah']:.2f}, VAL=${vp['val']:.2f}")
                print(f"    Age: {age_minutes:.1f} minutes ago")
                print(f"    Total Volume: {vp.get('total_volume', 'N/A')}")
                
                if age_minutes < 5:
                    recent_indicators = True
                    print("    ✅ Recent indicator")
                else:
                    print("    ⚠️  Old indicator")
            else:
                print("  Volume Profile: None")
            
            if of:
                of_time = of['timestamp']
                if isinstance(of_time, str):
                    of_time = datetime.fromisoformat(of_time.replace('Z', '+00:00'))
                elif of_time.tzinfo is None:
                    of_time = of_time.replace(tzinfo=timezone.utc)
                
                age_minutes = (cutoff_time - of_time).total_seconds() / 60
                
                print(f"  Order Flow: Delta={of['delta']:.2f}, Cumulative={of['cumulative_delta']:.2f}")
                print(f"    Age: {age_minutes:.1f} minutes ago")
                print(f"    Buy/Sell: {of['buy_volume']:.2f}/{of['sell_volume']:.2f}")
                print(f"    Large Trades: {of.get('large_trades_count', 0)}")
                print(f"    Absorption: {of.get('absorption_detected', False)}")
                
                if age_minutes < 5:
                    recent_indicators = True
                    print("    ✅ Recent indicator")
                else:
                    print("    ⚠️  Old indicator")
            else:
                print("  Order Flow: None")
        
        # Check trade availability
        print(f"\n=== Trade Availability Check ===")
        total_recent_trades = 0
        
        for symbol, exchange in symbols_exchanges:
            trades = storage.get_recent_trades(symbol, exchange, minutes=5)
            print(f"{exchange} {symbol}: {len(trades)} trades (last 5min)")
            total_recent_trades += len(trades)
        
        print(f"Total recent trades: {total_recent_trades}")
        
        # Verification results
        print(f"\n=== VERIFICATION RESULTS ===")
        
        if total_recent_trades > 0:
            print("✅ Trade collection is working")
        else:
            print("❌ No recent trades - collectors may not be running")
        
        if stats['volume_profiles_count'] > 0:
            print("✅ Volume Profile calculation is working")
        else:
            print("❌ No Volume Profiles calculated")
        
        if stats['order_flows_count'] > 0:
            print("✅ Order Flow calculation is working")
        else:
            print("❌ No Order Flows calculated")
        
        if recent_indicators:
            print("✅ Recent indicators found - TASK-001 fixes working!")
        elif stats['volume_profiles_count'] > 0 or stats['order_flows_count'] > 0:
            print("⚠️  Indicators exist but may be old - restart system for best results")
        else:
            print("❌ No indicators found - check if system is running")
        
        # Success criteria
        success_score = 0
        if total_recent_trades > 0: success_score += 1
        if stats['volume_profiles_count'] > 0: success_score += 1
        if stats['order_flows_count'] > 0: success_score += 1
        if recent_indicators: success_score += 2
        
        print(f"\nSuccess Score: {success_score}/5")
        
        if success_score >= 4:
            print("🎉 TASK-001 FIXES SUCCESSFUL!")
            print("   Indicators are calculating properly")
        elif success_score >= 2:
            print("🔧 PARTIAL SUCCESS - May need system restart")
        else:
            print("🔴 FIXES NOT WORKING - Check system status")
        
        # Next steps
        print(f"\n=== Next Steps ===")
        if success_score >= 4:
            print("✅ Ready for TASK-002: Volume Profile Enhancement")
            print("✅ Ready for TASK-025: Institutional Data Sources")
        elif total_recent_trades == 0:
            print("🚀 Start the system: python main.py")
        else:
            print("🔄 Restart the system for fresh indicator calculations")
        
    except Exception as e:
        print(f"Error during verification: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        storage.close()

if __name__ == "__main__":
    verify_task001_fix()
