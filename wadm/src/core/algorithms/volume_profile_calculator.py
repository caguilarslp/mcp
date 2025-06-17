"""
Volume Profile Calculator for analyzing price-volume distribution.

This module implements algorithms for:
- Point of Control (POC) calculation
- Value Area High/Low (VAH/VAL) calculation
- Price level aggregation with tick size
- Volume distribution analysis
"""

from typing import List, Dict, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class VolumeLevel:
    """Volume data for a specific price level."""
    price: Decimal
    volume: Decimal
    percentage: float
    in_value_area: bool = False


@dataclass
class VolumeProfileResult:
    """Complete volume profile analysis result."""
    poc: Decimal  # Point of Control (highest volume price)
    vah: Decimal  # Value Area High
    val: Decimal  # Value Area Low
    value_area_percent: float
    total_volume: Decimal
    levels: List[VolumeLevel]


class VolumeProfileCalculator:
    """
    Calculator for Volume Profile analysis.
    
    Features:
    - Point of Control (POC) identification
    - Value Area High/Low calculation with configurable percentage
    - Tick size-based price level aggregation
    - Volume distribution statistics
    """
    
    def __init__(self, tick_size: Optional[Decimal] = None):
        self.tick_size = tick_size
        logger.info(f"VolumeProfileCalculator initialized with tick_size={tick_size}")
    
    def calculate_volume_profile(
        self,
        trades: List,  # List of trades with price and volume
        value_area_percent: float = 70.0,
        symbol: Optional[str] = None
    ) -> VolumeProfileResult:
        """
        Calculate volume profile for a list of trades.
        
        Args:
            trades: List of trade objects with price and volume attributes
            value_area_percent: Percentage for value area calculation (60-95)
            symbol: Trading pair symbol for tick size calculation
            
        Returns:
            VolumeProfileResult with POC, VAH, VAL and levels
        """
        if not trades:
            return self._create_empty_profile(value_area_percent)
        
        # Determine tick size if not provided
        if not self.tick_size and symbol:
            self.tick_size = self._calculate_tick_size(symbol)
        
        # Aggregate volume by price levels
        price_volume_map = self._aggregate_by_price_levels(trades)
        
        if not price_volume_map:
            return self._create_empty_profile(value_area_percent)
        
        # Calculate total volume
        total_volume = sum(price_volume_map.values())
        
        # Find Point of Control (highest volume price)
        poc = max(price_volume_map.keys(), key=lambda p: price_volume_map[p])
        
        # Calculate Value Area High and Low
        vah, val = self._calculate_value_area(price_volume_map, poc, value_area_percent)
        
        # Create volume levels
        levels = self._create_volume_levels(price_volume_map, total_volume, vah, val)
        
        return VolumeProfileResult(
            poc=poc,
            vah=vah,
            val=val,
            value_area_percent=value_area_percent,
            total_volume=total_volume,
            levels=levels
        )
    
    def _aggregate_by_price_levels(self, trades: List) -> Dict[Decimal, Decimal]:
        """Aggregate volume by rounded price levels."""
        price_volume_map: Dict[Decimal, Decimal] = {}
        
        for trade in trades:
            # Get price and volume from trade
            price = getattr(trade, 'price', Decimal('0'))
            volume = getattr(trade, 'volume', None) or getattr(trade, 'quantity', Decimal('0'))
            
            # Round price to tick size
            rounded_price = self._round_to_tick_size(price)
            
            # Add volume to price level
            if rounded_price in price_volume_map:
                price_volume_map[rounded_price] += volume
            else:
                price_volume_map[rounded_price] = volume
        
        return price_volume_map
    
    def _calculate_value_area(
        self, 
        price_volume_map: Dict[Decimal, Decimal], 
        poc: Decimal, 
        value_area_percent: float
    ) -> Tuple[Decimal, Decimal]:
        """Calculate Value Area High and Low around POC."""
        target_volume = sum(price_volume_map.values()) * (value_area_percent / 100)
        
        # Start from POC and expand symmetrically
        prices = sorted(price_volume_map.keys())
        poc_index = prices.index(poc)
        
        # Initialize with POC volume
        accumulated_volume = price_volume_map[poc]
        vah = val = poc
        
        # Expand up and down alternately
        up_index = poc_index + 1
        down_index = poc_index - 1
        
        while accumulated_volume < target_volume and (up_index < len(prices) or down_index >= 0):
            # Choose direction based on which has more volume
            up_volume = price_volume_map[prices[up_index]] if up_index < len(prices) else Decimal('0')
            down_volume = price_volume_map[prices[down_index]] if down_index >= 0 else Decimal('0')
            
            if up_volume >= down_volume and up_index < len(prices):
                # Expand up
                accumulated_volume += up_volume
                vah = prices[up_index]
                up_index += 1
            elif down_index >= 0:
                # Expand down
                accumulated_volume += down_volume
                val = prices[down_index]
                down_index -= 1
            else:
                break
        
        return vah, val
    
    def _create_volume_levels(
        self, 
        price_volume_map: Dict[Decimal, Decimal], 
        total_volume: Decimal,
        vah: Decimal,
        val: Decimal
    ) -> List[VolumeLevel]:
        """Create volume levels with metadata."""
        levels = []
        
        for price, volume in price_volume_map.items():
            percentage = float(volume / total_volume * 100) if total_volume > 0 else 0.0
            in_value_area = val <= price <= vah
            
            levels.append(VolumeLevel(
                price=price,
                volume=volume,
                percentage=percentage,
                in_value_area=in_value_area
            ))
        
        # Sort by price
        return sorted(levels, key=lambda l: l.price)
    
    def _round_to_tick_size(self, price: Decimal) -> Decimal:
        """Round price to nearest tick size."""
        if self.tick_size and self.tick_size > 0:
            return (price / self.tick_size).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * self.tick_size
        return price
    
    def _calculate_tick_size(self, symbol: str) -> Decimal:
        """Calculate appropriate tick size based on symbol."""
        if symbol.endswith('USDT') or symbol.endswith('USDC'):
            if symbol.startswith('BTC') or symbol.startswith('ETH'):
                return Decimal('0.01')
            else:
                return Decimal('0.0001')
        return Decimal('0.00001')
    
    def _create_empty_profile(self, value_area_percent: float) -> VolumeProfileResult:
        """Create empty volume profile for when no trades available."""
        return VolumeProfileResult(
            poc=Decimal('0'),
            vah=Decimal('0'),
            val=Decimal('0'),
            value_area_percent=value_area_percent,
            total_volume=Decimal('0'),
            levels=[]
        )
