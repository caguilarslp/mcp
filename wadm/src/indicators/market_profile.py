"""
Market Profile Calculator
Time Price Opportunity (TPO) and Value Area calculations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
import numpy as np
from collections import defaultdict
from src.models import Exchange
from src.config import MARKET_PROFILE_TPO_SIZE, MARKET_PROFILE_VALUE_AREA_PERCENT
from src.logger import get_logger

logger = get_logger(__name__)


class MarketProfileCalculator:
    """Calculate Market Profile with TPO letters"""
    
    def __init__(self):
        self.tpo_size = MARKET_PROFILE_TPO_SIZE  # Minutes per TPO
        self.value_area_percent = MARKET_PROFILE_VALUE_AREA_PERCENT
        self.tpo_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    
    def calculate(self, trades: List[Dict[str, Any]], symbol: str, exchange: str) -> Dict[str, Any]:
        """
        Calculate Market Profile for the trading session
        Returns TPO distribution and value areas
        """
        if not trades:
            raise ValueError("No trades provided")
        
        # Determine session boundaries
        timestamps = [t["timestamp"] for t in trades]
        session_start = min(timestamps)
        session_end = max(timestamps)
        
        # Create price histogram with TPO letters
        price_tpos = defaultdict(list)  # price -> list of TPO letters
        tpo_volumes = defaultdict(float)  # price -> total volume
        
        # Group trades by TPO period
        current_tpo_start = session_start
        current_tpo_index = 0
        
        # Sort trades by timestamp
        sorted_trades = sorted(trades, key=lambda x: x["timestamp"])
        
        for trade in sorted_trades:
            # Check if we need to move to next TPO period
            trade_time = trade["timestamp"]
            if isinstance(trade_time, str):
                trade_time = datetime.fromisoformat(trade_time.replace('Z', '+00:00'))
            
            while trade_time >= current_tpo_start + timedelta(minutes=self.tpo_size):
                current_tpo_start += timedelta(minutes=self.tpo_size)
                current_tpo_index += 1
                if current_tpo_index >= len(self.tpo_letters):
                    current_tpo_index = 0
            
            # Get TPO letter for this period
            tpo_letter = self.tpo_letters[current_tpo_index]
            
            # Round price to nearest tick
            price = round(trade["price"], 2)
            
            # Add TPO letter if not already present for this price
            if tpo_letter not in price_tpos[price]:
                price_tpos[price].append(tpo_letter)
            
            # Add volume
            tpo_volumes[price] += trade["quantity"]
        
        # Calculate Initial Balance (first 2 TPOs)
        ib_high = 0
        ib_low = float('inf')
        ib_letters = self.tpo_letters[:2] if len(self.tpo_letters) >= 2 else self.tpo_letters
        
        for price, tpos in price_tpos.items():
            if any(letter in ib_letters for letter in tpos):
                ib_high = max(ib_high, price)
                ib_low = min(ib_low, price)
        
        # Find Point of Control (POC) - price with most TPOs
        poc = max(price_tpos.keys(), key=lambda p: len(price_tpos[p]))
        
        # Calculate Value Area
        vah, val = self._calculate_value_area(price_tpos, tpo_volumes)
        
        # Identify single prints (prices with only one TPO)
        single_prints = [price for price, tpos in price_tpos.items() if len(tpos) == 1]
        
        # Calculate market type
        market_type = self._determine_market_type(price_tpos, ib_high, ib_low)
        
        # Create profile visualization
        profile_visual = self._create_profile_visual(price_tpos)
        
        return {
            "symbol": symbol,
            "exchange": Exchange(exchange),
            "timestamp": datetime.now(timezone.utc),
            "session_start": session_start,
            "session_end": session_end,
            "poc": poc,
            "vah": vah,
            "val": val,
            "ib_high": ib_high,
            "ib_low": ib_low,
            "single_prints": single_prints,
            "market_type": market_type,
            "tpo_count": sum(len(tpos) for tpos in price_tpos.values()),
            "price_levels": len(price_tpos),
            "profile": profile_visual,
            "statistics": {
                "range": max(price_tpos.keys()) - min(price_tpos.keys()),
                "value_area_size": vah - val,
                "ib_range": ib_high - ib_low,
                "single_print_percentage": len(single_prints) / max(1, len(price_tpos)) * 100
            }
        }
    
    def _calculate_value_area(self, price_tpos: Dict[float, List[str]], 
                             tpo_volumes: Dict[float, float]) -> Tuple[float, float]:
        """Calculate Value Area High and Low (70% of TPOs around POC)"""
        if not price_tpos:
            return 0, 0
        
        # Calculate total TPOs
        total_tpos = sum(len(tpos) for tpos in price_tpos.values())
        target_tpos = total_tpos * (self.value_area_percent / 100)
        
        # Find POC
        poc = max(price_tpos.keys(), key=lambda p: len(price_tpos[p]))
        
        # Start from POC and expand
        sorted_prices = sorted(price_tpos.keys())
        poc_index = sorted_prices.index(poc)
        
        accumulated_tpos = len(price_tpos[poc])
        upper_index = poc_index
        lower_index = poc_index
        
        # Expand from POC
        while accumulated_tpos < target_tpos:
            upper_tpos = 0
            lower_tpos = 0
            
            # Check upper expansion
            if upper_index + 1 < len(sorted_prices):
                upper_tpos = len(price_tpos[sorted_prices[upper_index + 1]])
            
            # Check lower expansion
            if lower_index - 1 >= 0:
                lower_tpos = len(price_tpos[sorted_prices[lower_index - 1]])
            
            # Expand in direction with more TPOs
            if upper_tpos >= lower_tpos and upper_index + 1 < len(sorted_prices):
                upper_index += 1
                accumulated_tpos += upper_tpos
            elif lower_index - 1 >= 0:
                lower_index -= 1
                accumulated_tpos += lower_tpos
            else:
                break
        
        vah = sorted_prices[upper_index]
        val = sorted_prices[lower_index]
        
        return vah, val
    
    def _determine_market_type(self, price_tpos: Dict[float, List[str]], 
                              ib_high: float, ib_low: float) -> str:
        """Determine market profile type"""
        if not price_tpos or ib_high == 0:
            return "undefined"
        
        sorted_prices = sorted(price_tpos.keys())
        high = max(sorted_prices)
        low = min(sorted_prices)
        
        # Check range extension from IB
        upper_extension = (high - ib_high) / (ib_high - ib_low) if ib_high > ib_low else 0
        lower_extension = (ib_low - low) / (ib_high - ib_low) if ib_high > ib_low else 0
        
        # Determine type based on shape and extension
        if upper_extension > 0.5 and lower_extension < 0.2:
            return "trend_up"
        elif lower_extension > 0.5 and upper_extension < 0.2:
            return "trend_down"
        elif upper_extension < 0.3 and lower_extension < 0.3:
            return "balanced"
        elif upper_extension > 0.3 and lower_extension > 0.3:
            return "double_distribution"
        else:
            return "neutral"
    
    def _create_profile_visual(self, price_tpos: Dict[float, List[str]]) -> List[Dict[str, Any]]:
        """Create visual representation of market profile"""
        if not price_tpos:
            return []
        
        profile = []
        sorted_prices = sorted(price_tpos.keys(), reverse=True)
        
        for price in sorted_prices:
            tpos = price_tpos[price]
            profile.append({
                "price": price,
                "tpos": "".join(sorted(tpos)),
                "count": len(tpos),
                "visual": "█" * min(len(tpos), 30)  # Visual bar, max 30 chars
            })
        
        return profile[:50]  # Limit to 50 price levels for visualization
