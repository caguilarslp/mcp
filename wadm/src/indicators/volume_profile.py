"""
Volume Profile indicator calculator
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
import numpy as np
from src.models import VolumeProfile, Exchange
from src.logger import get_logger
from src.config import VOLUME_PROFILE_BINS

logger = get_logger(__name__)

class VolumeProfileCalculator:
    """Calculate Volume Profile from trades"""
    
    @staticmethod
    def calculate(trades: List[Dict[str, Any]], symbol: str, exchange: str) -> VolumeProfile:
        """
        Calculate volume profile from trades
        Returns POC, VAH, VAL and volume distribution
        """
        if not trades:
            raise ValueError("No trades provided")
        
        # Extract prices and volumes
        prices = np.array([t["price"] for t in trades])
        volumes = np.array([t["quantity"] for t in trades])
        
        # Calculate price range
        min_price = prices.min()
        max_price = prices.max()
        
        # Create price bins
        bins = np.linspace(min_price, max_price, VOLUME_PROFILE_BINS + 1)
        bin_centers = (bins[:-1] + bins[1:]) / 2
        
        # Calculate volume for each bin
        volume_distribution = {}
        for i in range(len(bin_centers)):
            mask = (prices >= bins[i]) & (prices < bins[i + 1])
            bin_volume = volumes[mask].sum()
            if bin_volume > 0:
                # Convert float key to string for MongoDB compatibility
                volume_distribution[str(float(bin_centers[i]))] = float(bin_volume)
        
        # Find POC (Point of Control) - price with highest volume
        if not volume_distribution:
            poc = float(np.median(prices))
        else:
            # Find key with max volume (keys are now strings)
            poc_key = max(volume_distribution.keys(), key=lambda k: volume_distribution[k])
            poc = float(poc_key)
        
        # Calculate Value Area (70% of volume)
        total_volume = volumes.sum()
        vah, val = VolumeProfileCalculator._calculate_value_area(
            volume_distribution, total_volume, poc
        )
        
        return VolumeProfile(
            symbol=symbol,
            exchange=Exchange(exchange),
            timestamp=datetime.now(timezone.utc),
            poc=poc,
            vah=vah,
            val=val,
            volume_distribution=volume_distribution,
            total_volume=float(total_volume)
        )
    
    @staticmethod
    def _calculate_value_area(volume_dist: Dict[float, float], 
                            total_volume: float, 
                            poc: float) -> Tuple[float, float]:
        """Calculate Value Area High and Low (70% of volume around POC)"""
        if not volume_dist:
            return poc, poc
        
        target_volume = total_volume * 0.7
        accumulated_volume = volume_dist.get(str(poc), 0)
        
        # Sort prices (convert string keys back to float for sorting)
        sorted_prices = sorted([float(k) for k in volume_dist.keys()])
        poc_index = sorted_prices.index(poc)
        
        upper_index = poc_index
        lower_index = poc_index
        
        # Expand from POC until we have 70% of volume
        while accumulated_volume < target_volume:
            upper_vol = 0
            lower_vol = 0
            
            # Check upper expansion
            if upper_index + 1 < len(sorted_prices):
                upper_vol = volume_dist[str(sorted_prices[upper_index + 1])]
            
            # Check lower expansion
            if lower_index - 1 >= 0:
                lower_vol = volume_dist[str(sorted_prices[lower_index - 1])]
            
            # Expand in direction with more volume
            if upper_vol >= lower_vol and upper_index + 1 < len(sorted_prices):
                upper_index += 1
                accumulated_volume += upper_vol
            elif lower_index - 1 >= 0:
                lower_index -= 1
                accumulated_volume += lower_vol
            else:
                break
        
        vah = sorted_prices[upper_index]
        val = sorted_prices[lower_index]
        
        return vah, val
