#!/usr/bin/env python
"""
TASK-001 FIX: Improve indicator calculation logic
Fix the issues preventing indicators from calculating
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from src.storage import StorageManager
from src.indicators import VolumeProfileCalculator, OrderFlowCalculator
from src.logger import get_logger

logger = get_logger(__name__)

def fix_manager_logic():
    """Fix and test the improved manager logic"""
    print("\n=== TASK-001 FIX: Testing Improved Logic ===")
    
    storage = StorageManager()
    
    # Test the actual calculation logic with recent data
    symbols_exchanges = [("BTCUSDT", "bybit"), ("BTCUSDT", "binance")]
    
    for symbol, exchange in symbols_exchanges:
        print(f"\n--- Processing {symbol} on {exchange} ---")
        
        # Get more recent trades (last 10 minutes)
        trades = storage.get_recent_trades(symbol, exchange, minutes=10)
        print(f"Found {len(trades)} trades in last 10 minutes")
        
        if not trades:
            print("❌ No trades found - collectors might not be running")
            continue
            
        # Apply the improved validation logic
        valid_trades = []
        required_fields = ['price', 'quantity', 'side', 'timestamp']
        
        for trade in trades:
            try:
                # Check required fields
                if not all(field in trade for field in required_fields):
                    continue
                    
                # Validate and convert data types
                formatted_trade = {
                    'price': float(trade['price']),
                    'quantity': float(trade['quantity']),
                    'side': str(trade['side']).lower(),
                    'timestamp': trade['timestamp']
                }
                
                # Validate side
                if formatted_trade['side'] not in ['buy', 'sell']:
                    continue
                    
                # Validate numeric values
                if formatted_trade['price'] <= 0 or formatted_trade['quantity'] <= 0:
                    continue
                    
                valid_trades.append(formatted_trade)
                
            except (ValueError, TypeError) as e:
                logger.debug(f"Invalid trade data: {e}")
                continue
        
        print(f"Valid trades after filtering: {len(valid_trades)}")
        
        if len(valid_trades) >= 30:  # Lower threshold for testing
            print("✅ Sufficient trades for indicators")
            
            # Test Volume Profile
            try:
                print("  Calculating Volume Profile...")
                vp = VolumeProfileCalculator.calculate(valid_trades, symbol, exchange)
                storage.save_volume_profile(vp)
                print(f"  ✅ Volume Profile: POC=${vp.poc:.2f}, VAH=${vp.vah:.2f}, VAL=${vp.val:.2f}")
                print(f"     Total Volume: {vp.total_volume:.2f}")
            except Exception as e:
                print(f"  ❌ Volume Profile failed: {e}")
                import traceback
                traceback.print_exc()
            
            # Test Order Flow
            try:
                print("  Calculating Order Flow...")
                of_calc = OrderFlowCalculator()
                
                # Get previous flow for cumulative delta
                prev_flow = storage.get_latest_order_flow(symbol, exchange)
                
                of = of_calc.calculate(valid_trades, symbol, exchange, prev_flow)
                storage.save_order_flow(of)
                print(f"  ✅ Order Flow: Delta={of.delta:.2f}, Cumulative={of.cumulative_delta:.2f}")
                print(f"     Buy/Sell: {of.buy_volume:.2f}/{of.sell_volume:.2f}")
                print(f"     Large Trades: {of.large_trades_count}")
                print(f"     Absorption: {of.absorption_detected}")
            except Exception as e:
                print(f"  ❌ Order Flow failed: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"❌ Not enough valid trades: {len(valid_trades)} < 30")
    
    # Final stats
    stats = storage.get_stats()
    print(f"\n=== Updated Stats ===")
    print(f"Trades: {stats['trades_count']}")
    print(f"Volume Profiles: {stats['volume_profiles_count']}")
    print(f"Order Flows: {stats['order_flows_count']}")
    
    storage.close()

def create_improved_manager_patch():
    """Create patch for manager.py with improvements"""
    patch_content = '''
# PATCH FOR manager.py - Apply these changes to fix TASK-001

# 1. In calculate_indicators method, change the minimum trades requirement:
# OLD: if len(trades) < 50:
# NEW: if len(trades) < 20:

# 2. Improve trade validation in calculate_indicators:
def validate_and_format_trades(self, trades):
    """Validate and format trades for indicator calculation"""
    valid_trades = []
    required_fields = ['price', 'quantity', 'side', 'timestamp']
    
    for trade in trades:
        try:
            # Check required fields
            if not all(field in trade for field in required_fields):
                continue
                
            # Validate and convert data types
            formatted_trade = {
                'price': float(trade['price']),
                'quantity': float(trade['quantity']),
                'side': str(trade['side']).lower(),
                'timestamp': trade['timestamp']
            }
            
            # Validate side
            if formatted_trade['side'] not in ['buy', 'sell']:
                continue
                
            # Validate numeric values
            if formatted_trade['price'] <= 0 or formatted_trade['quantity'] <= 0:
                continue
                
            valid_trades.append(formatted_trade)
            
        except (ValueError, TypeError) as e:
            logger.debug(f"Invalid trade data: {e}")
            continue
    
    return valid_trades

# 3. In calculate_indicators, replace the validation section:
# OLD: Ensure trades have required fields and correct format section
# NEW: valid_trades = self.validate_and_format_trades(trades)

# 4. Change the minimum valid trades check:
# OLD: if len(valid_trades) < 50:
# NEW: if len(valid_trades) < 20:

# 5. In process_trades method, reduce the time threshold:
# OLD: if (now - last_calc).total_seconds() > 10:
# NEW: if (now - last_calc).total_seconds() > 5:

# 6. Add more aggressive indicator calculation in periodic_tasks:
# Add this check every 15 seconds instead of 30:
if current_time % 15 == 0:
    # Force calculate indicators for any symbol with recent trades
    for symbol in BYBIT_SYMBOLS + BINANCE_SYMBOLS:
        for exchange in ["bybit", "binance"]:
            recent_trades = self.storage.get_recent_trades(symbol, exchange, minutes=2)
            if len(recent_trades) >= 20:
                await self.calculate_indicators(symbol, exchange)
'''
    
    with open("D:\\projects\\mcp\\wadm\\TASK-001-PATCH.md", "w") as f:
        f.write(patch_content)
    
    print("\n=== Patch Created ===")
    print("Patch file created: TASK-001-PATCH.md")
    print("Apply these changes to src/manager.py to fix the indicator calculation issues")

if __name__ == "__main__":
    # First test the current logic
    fix_manager_logic()
    
    # Create patch for manager improvements
    create_improved_manager_patch()
    
    print("\n=== TASK-001 Fix Complete ===")
    print("Next steps:")
    print("1. Apply the patch to src/manager.py")
    print("2. Restart the WADM system")
    print("3. Run check_status.py to verify indicators are calculating")
