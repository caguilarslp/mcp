"""
Footprint Chart Calculator
Bid/Ask volume imbalances by price level
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from decimal import Decimal
from collections import defaultdict
from src.models import Exchange
from src.config import FOOTPRINT_TICK_SIZE, FOOTPRINT_TIME_FRAME, FOOTPRINT_IMBALANCE_THRESHOLD
from src.logger import get_logger

logger = get_logger(__name__)


class FootprintCalculator:
    """Calculate footprint charts showing bid/ask imbalances"""
    
    def __init__(self):
        self.tick_size = FOOTPRINT_TICK_SIZE
        self.time_frame = FOOTPRINT_TIME_FRAME
        self.imbalance_threshold = FOOTPRINT_IMBALANCE_THRESHOLD
    
    def calculate(self, trades: List[Dict[str, Any]], symbol: str, exchange: str) -> Dict[str, Any]:
        """
        Calculate footprint chart data
        Returns bid/ask volumes by price level and time
        """
        if not trades:
            raise ValueError("No trades provided")
        
        # Group trades by time window and price level
        footprints = defaultdict(lambda: defaultdict(lambda: {"bid": 0, "ask": 0}))
        
        for trade in trades:
            # Get time window
            timestamp = trade["timestamp"]
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            window_start = timestamp.replace(second=0, microsecond=0)
            window_key = window_start.isoformat()
            
            # Get price level (rounded to tick size)
            price = Decimal(str(trade["price"]))
            price_level = self._round_to_tick(price)
            
            # Add volume to appropriate side
            volume = float(trade["quantity"])
            if trade["side"] == "buy":
                footprints[window_key][float(price_level)]["bid"] += volume
            else:
                footprints[window_key][float(price_level)]["ask"] += volume
        
        # Calculate imbalances and identify key levels
        results = []
        for time_window, price_levels in footprints.items():
            window_data = {
                "timestamp": time_window,
                "price_levels": {},
                "imbalances": [],
                "total_bid": 0,
                "total_ask": 0
            }
            
            for price, volumes in price_levels.items():
                bid_vol = volumes["bid"]
                ask_vol = volumes["ask"]
                total_vol = bid_vol + ask_vol
                
                if total_vol > 0:
                    # Calculate imbalance ratio
                    if ask_vol > 0:
                        imbalance_ratio = bid_vol / ask_vol
                    else:
                        imbalance_ratio = float('inf') if bid_vol > 0 else 1.0
                    
                    # Check for significant imbalance
                    is_imbalanced = (
                        imbalance_ratio > float(self.imbalance_threshold) or
                        imbalance_ratio < 1 / float(self.imbalance_threshold)
                    )
                    
                    level_data = {
                        "bid_volume": bid_vol,
                        "ask_volume": ask_vol,
                        "total_volume": total_vol,
                        "imbalance_ratio": imbalance_ratio,
                        "imbalanced": is_imbalanced,
                        "dominant_side": "bid" if bid_vol > ask_vol else "ask"
                    }
                    
                    window_data["price_levels"][price] = level_data
                    window_data["total_bid"] += bid_vol
                    window_data["total_ask"] += ask_vol
                    
                    if is_imbalanced:
                        window_data["imbalances"].append({
                            "price": price,
                            "ratio": imbalance_ratio,
                            "dominant_side": level_data["dominant_side"]
                        })
            
            results.append(window_data)
        
        # Sort results by timestamp
        results.sort(key=lambda x: x["timestamp"])
        
        # Identify key footprint patterns
        patterns = self._identify_patterns(results)
        
        return {
            "symbol": symbol,
            "exchange": Exchange(exchange),
            "timestamp": datetime.now(timezone.utc),
            "tick_size": float(self.tick_size),
            "time_frame": self.time_frame,
            "footprints": results[-10:],  # Last 10 time windows
            "patterns": patterns,
            "summary": {
                "total_windows": len(results),
                "avg_imbalances_per_window": sum(len(r["imbalances"]) for r in results) / max(1, len(results)),
                "bid_dominance": sum(1 for r in results if r["total_bid"] > r["total_ask"]) / max(1, len(results))
            }
        }
    
    def _round_to_tick(self, price: Decimal) -> Decimal:
        """Round price to nearest tick size"""
        return (price / self.tick_size).quantize(Decimal('1')) * self.tick_size
    
    def _identify_patterns(self, footprints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify institutional footprint patterns"""
        patterns = []
        
        if len(footprints) < 2:
            return patterns
        
        for i in range(1, len(footprints)):
            current = footprints[i]
            previous = footprints[i-1]
            
            # Pattern 1: Absorption (high volume, small price movement)
            if current["total_bid"] + current["total_ask"] > (previous["total_bid"] + previous["total_ask"]) * 2:
                price_levels_current = list(current["price_levels"].keys())
                price_levels_prev = list(previous["price_levels"].keys())
                
                if price_levels_current and price_levels_prev:
                    price_movement = abs(max(price_levels_current) - max(price_levels_prev))
                    avg_price = (max(price_levels_current) + max(price_levels_prev)) / 2
                    
                    if avg_price > 0 and (price_movement / avg_price) < 0.001:  # Less than 0.1% movement
                        patterns.append({
                            "type": "absorption",
                            "timestamp": current["timestamp"],
                            "volume_increase": (current["total_bid"] + current["total_ask"]) / 
                                             (previous["total_bid"] + previous["total_ask"]),
                            "price_movement": price_movement
                        })
            
            # Pattern 2: Iceberg orders (consistent volume at specific price)
            for price, level in current["price_levels"].items():
                if price in previous["price_levels"]:
                    prev_level = previous["price_levels"][price]
                    
                    # Check for consistent large volume at same price
                    if (level["total_volume"] > 0 and 
                        prev_level["total_volume"] > 0 and
                        abs(level["total_volume"] - prev_level["total_volume"]) / prev_level["total_volume"] < 0.2):
                        
                        patterns.append({
                            "type": "iceberg",
                            "timestamp": current["timestamp"],
                            "price": price,
                            "avg_volume": (level["total_volume"] + prev_level["total_volume"]) / 2,
                            "side": level["dominant_side"]
                        })
        
        return patterns[-5:]  # Return last 5 patterns
