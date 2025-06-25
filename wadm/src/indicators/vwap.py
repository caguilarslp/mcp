"""
VWAP (Volume Weighted Average Price) Calculator
With standard deviation bands and multiple anchor points
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
from src.models import Exchange
from src.config import VWAP_ANCHORS
from src.logger import get_logger

logger = get_logger(__name__)


class VWAPCalculator:
    """Calculate VWAP with bands for different time anchors"""
    
    def __init__(self):
        self.anchors = VWAP_ANCHORS  # ["daily", "weekly", "monthly"]
        self.std_devs = [1, 2, 3]  # Standard deviation multipliers for bands
    
    def calculate(self, trades: List[Dict[str, Any]], symbol: str, exchange: str) -> Dict[str, Any]:
        """
        Calculate VWAP with bands for multiple anchor points
        """
        if not trades:
            raise ValueError("No trades provided")
        
        # Sort trades by timestamp
        sorted_trades = sorted(trades, key=lambda x: x["timestamp"])
        
        # Calculate VWAP for each anchor
        vwap_results = {}
        
        for anchor in self.anchors:
            # Get trades for this anchor period
            anchor_trades = self._filter_trades_by_anchor(sorted_trades, anchor)
            
            if anchor_trades:
                vwap_data = self._calculate_vwap_with_bands(anchor_trades)
                vwap_results[anchor] = vwap_data
        
        # Calculate current position relative to VWAPs
        current_price = sorted_trades[-1]["price"] if sorted_trades else 0
        position_analysis = self._analyze_price_position(current_price, vwap_results)
        
        return {
            "symbol": symbol,
            "exchange": Exchange(exchange),
            "timestamp": datetime.now(timezone.utc),
            "current_price": current_price,
            "vwaps": vwap_results,
            "position_analysis": position_analysis,
            "summary": self._create_summary(vwap_results, current_price)
        }
    
    def _filter_trades_by_anchor(self, trades: List[Dict[str, Any]], anchor: str) -> List[Dict[str, Any]]:
        """Filter trades based on anchor period"""
        if not trades:
            return []
        
        now = datetime.now(timezone.utc)
        
        if anchor == "daily":
            cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif anchor == "weekly":
            days_since_monday = now.weekday()
            cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
        elif anchor == "monthly":
            cutoff = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            cutoff = now - timedelta(days=1)  # Default to 24 hours
        
        filtered_trades = []
        for trade in trades:
            trade_time = trade["timestamp"]
            if isinstance(trade_time, str):
                trade_time = datetime.fromisoformat(trade_time.replace('Z', '+00:00'))
            
            if trade_time >= cutoff:
                filtered_trades.append(trade)
        
        return filtered_trades
    
    def _calculate_vwap_with_bands(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate VWAP and standard deviation bands"""
        if not trades:
            return {}
        
        # Calculate cumulative values
        cumulative_pv = 0  # Price * Volume
        cumulative_volume = 0
        cumulative_pv2 = 0  # Price² * Volume for variance
        
        vwap_series = []
        
        for trade in trades:
            price = trade["price"]
            volume = trade["quantity"]
            
            cumulative_pv += price * volume
            cumulative_volume += volume
            cumulative_pv2 += (price ** 2) * volume
            
            if cumulative_volume > 0:
                vwap = cumulative_pv / cumulative_volume
                
                # Calculate variance and standard deviation
                variance = (cumulative_pv2 / cumulative_volume) - (vwap ** 2)
                std_dev = np.sqrt(max(0, variance))  # Ensure non-negative
                
                vwap_series.append({
                    "timestamp": trade["timestamp"],
                    "vwap": vwap,
                    "std_dev": std_dev
                })
        
        if not vwap_series:
            return {}
        
        # Get final values
        final_vwap = vwap_series[-1]["vwap"]
        final_std = vwap_series[-1]["std_dev"]
        
        # Calculate bands
        bands = {}
        for multiplier in self.std_devs:
            bands[f"upper_{multiplier}std"] = final_vwap + (multiplier * final_std)
            bands[f"lower_{multiplier}std"] = final_vwap - (multiplier * final_std)
        
        return {
            "vwap": final_vwap,
            "std_dev": final_std,
            "bands": bands,
            "total_volume": cumulative_volume,
            "data_points": len(trades),
            "series": vwap_series[-100:]  # Last 100 points for charting
        }
    
    def _analyze_price_position(self, current_price: float, vwap_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current price position relative to VWAPs"""
        analysis = {}
        
        for anchor, data in vwap_results.items():
            if not data or "vwap" not in data:
                continue
            
            vwap = data["vwap"]
            std_dev = data.get("std_dev", 0)
            
            # Calculate position
            if std_dev > 0:
                z_score = (current_price - vwap) / std_dev
            else:
                z_score = 0
            
            # Determine position description
            if current_price > vwap:
                if z_score > 3:
                    position = "far_above"
                elif z_score > 2:
                    position = "well_above"
                elif z_score > 1:
                    position = "above"
                else:
                    position = "slightly_above"
            else:
                if z_score < -3:
                    position = "far_below"
                elif z_score < -2:
                    position = "well_below"
                elif z_score < -1:
                    position = "below"
                else:
                    position = "slightly_below"
            
            analysis[anchor] = {
                "position": position,
                "z_score": round(z_score, 2),
                "distance": round(current_price - vwap, 2),
                "distance_percent": round((current_price - vwap) / vwap * 100, 2) if vwap > 0 else 0
            }
        
        return analysis
    
    def _create_summary(self, vwap_results: Dict[str, Any], current_price: float) -> Dict[str, Any]:
        """Create summary of VWAP analysis"""
        if not vwap_results:
            return {"status": "no_data"}
        
        # Check alignment across timeframes
        all_above = all(
            current_price > data.get("vwap", 0) 
            for data in vwap_results.values() 
            if data
        )
        
        all_below = all(
            current_price < data.get("vwap", float('inf')) 
            for data in vwap_results.values() 
            if data
        )
        
        # Determine trend
        if all_above:
            trend = "bullish"
            strength = "strong"
        elif all_below:
            trend = "bearish"
            strength = "strong"
        else:
            trend = "mixed"
            strength = "weak"
        
        # Find nearest support/resistance
        support = None
        resistance = None
        
        for anchor, data in vwap_results.items():
            if data and "vwap" in data:
                vwap = data["vwap"]
                if vwap < current_price and (support is None or vwap > support):
                    support = vwap
                elif vwap > current_price and (resistance is None or vwap < resistance):
                    resistance = vwap
        
        return {
            "trend": trend,
            "strength": strength,
            "nearest_support": round(support, 2) if support else None,
            "nearest_resistance": round(resistance, 2) if resistance else None,
            "aligned": all_above or all_below
        }
