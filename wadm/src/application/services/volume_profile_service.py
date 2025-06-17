"""
Volume Profile Service - Core business logic for volume profile calculations.

This service implements the calculation of Volume Profile indicators:
- POC (Point of Control): Price level with highest volume
- VAH (Value Area High): Upper boundary of 70% volume area  
- VAL (Value Area Low): Lower boundary of 70% volume area
- Volume distribution by price levels
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

from src.core.entities import Trade, VolumeProfile
from src.core.types import Symbol, Exchange
from src.infrastructure.database.repositories import TradeRepository


logger = logging.getLogger(__name__)


class VolumeProfileCalculator:
    """Core volume profile calculation engine."""
    
    def __init__(self, tick_size: Decimal = Decimal("0.01")):
        """
        Initialize calculator.
        
        Args:
            tick_size: Minimum price increment for grouping trades
        """
        self.tick_size = tick_size
    
    def calculate_price_levels(self, trades: List[Trade]) -> Dict[Decimal, Decimal]:
        """
        Group trades by price levels and sum volumes.
        
        Args:
            trades: List of trades to analyze
            
        Returns:
            Dict mapping price -> total volume at that price
        """
        if not trades:
            return {}
        
        price_volumes = defaultdict(Decimal)
        
        for trade in trades:
            # Round price to nearest tick
            rounded_price = self._round_to_tick(trade.price)
            price_volumes[rounded_price] += trade.quantity
            
        return dict(price_volumes)
    
    def calculate_poc(self, price_levels: Dict[Decimal, Decimal]) -> Optional[Decimal]:
        """
        Calculate Point of Control (POC) - price with highest volume.
        
        Args:
            price_levels: Dict of price -> volume
            
        Returns:
            POC price or None if no data
        """
        if not price_levels:
            return None
            
        return max(price_levels.keys(), key=lambda p: price_levels[p])
    
    def calculate_value_area(
        self, 
        price_levels: Dict[Decimal, Decimal], 
        value_area_percentage: Decimal = Decimal("0.70")
    ) -> Tuple[Optional[Decimal], Optional[Decimal], Decimal]:
        """
        Calculate Value Area High (VAH) and Value Area Low (VAL).
        
        Value Area contains the specified percentage (default 70%) of total volume,
        centered around the POC.
        
        Args:
            price_levels: Dict of price -> volume
            value_area_percentage: Percentage of volume to include (0.70 = 70%)
            
        Returns:
            Tuple of (VAH, VAL, value_area_volume)
        """
        if not price_levels:
            return None, None, Decimal("0")
        
        # Calculate total volume
        total_volume = sum(price_levels.values())
        target_volume = total_volume * value_area_percentage
        
        # Find POC
        poc = self.calculate_poc(price_levels)
        if not poc:
            return None, None, Decimal("0")
        
        # Sort prices for easier processing
        sorted_prices = sorted(price_levels.keys())
        poc_index = sorted_prices.index(poc)
        
        # Start with POC volume
        value_area_volume = price_levels[poc]
        val_index = poc_index
        vah_index = poc_index
        
        # Expand value area symmetrically around POC
        while value_area_volume < target_volume:
            # Calculate volume if we expand up or down
            up_volume = (
                price_levels[sorted_prices[vah_index + 1]] 
                if vah_index + 1 < len(sorted_prices) 
                else Decimal("0")
            )
            down_volume = (
                price_levels[sorted_prices[val_index - 1]] 
                if val_index > 0 
                else Decimal("0")
            )
            
            # Choose direction with higher volume
            if up_volume >= down_volume and vah_index + 1 < len(sorted_prices):
                vah_index += 1
                value_area_volume += up_volume
            elif val_index > 0:
                val_index -= 1
                value_area_volume += down_volume
            else:
                # Can't expand further
                break
        
        vah = sorted_prices[vah_index]
        val = sorted_prices[val_index]
        
        return vah, val, value_area_volume
    
    def _round_to_tick(self, price: Decimal) -> Decimal:
        """Round price to nearest tick size."""
        return (price / self.tick_size).quantize(
            Decimal("1"), 
            rounding=ROUND_HALF_UP
        ) * self.tick_size


class VolumeProfileService:
    """Service for calculating and managing volume profiles."""
    
    def __init__(self, trade_repository: TradeRepository):
        """
        Initialize service.
        
        Args:
            trade_repository: Repository for accessing trade data
        """
        self.trade_repository = trade_repository
        self.calculators: Dict[str, VolumeProfileCalculator] = {}
        
    def get_calculator(self, symbol: Symbol) -> VolumeProfileCalculator:
        """
        Get or create calculator for symbol with appropriate tick size.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            VolumeProfileCalculator instance
        """
        if symbol not in self.calculators:
            # Determine tick size based on symbol
            tick_size = self._get_tick_size(symbol)
            self.calculators[symbol] = VolumeProfileCalculator(tick_size)
        
        return self.calculators[symbol]
    
    async def calculate_volume_profile(
        self,
        symbol: Symbol,
        exchange: Exchange,
        start_time: datetime,
        end_time: datetime,
        value_area_percentage: Decimal = Decimal("0.70")
    ) -> Optional[VolumeProfile]:
        """
        Calculate volume profile for given time period.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            start_time: Period start time
            end_time: Period end time
            value_area_percentage: Value area percentage (default 70%)
            
        Returns:
            VolumeProfile instance or None if no data
        """
        try:
            # Get trades for the period
            trades = await self.trade_repository.find_by_time_range(
                symbol=symbol,
                exchange=exchange,
                start_time=start_time,
                end_time=end_time
            )
            
            if not trades:
                logger.warning(
                    f"No trades found for {symbol} on {exchange} "
                    f"between {start_time} and {end_time}"
                )
                return None
            
            # Calculate volume profile
            calculator = self.get_calculator(symbol)
            price_levels = calculator.calculate_price_levels(trades)
            
            if not price_levels:
                return None
            
            # Calculate POC
            poc = calculator.calculate_poc(price_levels)
            
            # Calculate Value Area
            vah, val, value_area_volume = calculator.calculate_value_area(
                price_levels, value_area_percentage
            )
            
            # Calculate total volume
            total_volume = sum(price_levels.values())
            
            # Convert price_levels to string keys for JSON serialization
            price_levels_str = {
                str(price): volume for price, volume in price_levels.items()
            }
            
            # Create VolumeProfile entity
            volume_profile = VolumeProfile(
                symbol=symbol,
                exchange=exchange,
                start_time=start_time,
                end_time=end_time,
                price_levels=price_levels_str,
                poc_price=poc or Decimal("0"),
                vah_price=vah or Decimal("0"),
                val_price=val or Decimal("0"),
                total_volume=total_volume,
                value_area_volume=value_area_volume
            )
            
            logger.info(
                f"Calculated volume profile for {symbol} on {exchange}: "
                f"POC={poc}, VAH={vah}, VAL={val}, "
                f"Total Volume={total_volume}, VA Volume={value_area_volume}"
            )
            
            return volume_profile
            
        except Exception as e:
            logger.error(
                f"Error calculating volume profile for {symbol} on {exchange}: {e}",
                exc_info=True
            )
            return None
    
    async def calculate_real_time_profile(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe_minutes: int = 60
    ) -> Optional[VolumeProfile]:
        """
        Calculate volume profile for current time period.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe_minutes: Timeframe in minutes for current profile
            
        Returns:
            Current volume profile or None
        """
        now = datetime.utcnow()
        
        # Calculate period boundaries based on timeframe
        if timeframe_minutes == 60:  # 1 hour
            start_time = now.replace(minute=0, second=0, microsecond=0)
        elif timeframe_minutes == 240:  # 4 hours
            hour_group = (now.hour // 4) * 4
            start_time = now.replace(hour=hour_group, minute=0, second=0, microsecond=0)
        elif timeframe_minutes == 1440:  # 1 day
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            # For other timeframes, start from current time minus duration
            start_time = now - timedelta(minutes=timeframe_minutes)
        
        return await self.calculate_volume_profile(
            symbol=symbol,
            exchange=exchange,
            start_time=start_time,
            end_time=now
        )
    
    async def get_historical_profiles(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe_minutes: int = 60,
        periods: int = 24
    ) -> List[VolumeProfile]:
        """
        Get historical volume profiles for multiple periods.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe_minutes: Timeframe in minutes
            periods: Number of historical periods to retrieve
            
        Returns:
            List of historical volume profiles
        """
        profiles = []
        now = datetime.utcnow()
        
        for i in range(periods):
            # Calculate period boundaries
            end_time = now - timedelta(minutes=i * timeframe_minutes)
            start_time = end_time - timedelta(minutes=timeframe_minutes)
            
            profile = await self.calculate_volume_profile(
                symbol=symbol,
                exchange=exchange,
                start_time=start_time,
                end_time=end_time
            )
            
            if profile:
                profiles.append(profile)
        
        return profiles
    
    def _get_tick_size(self, symbol: Symbol) -> Decimal:
        """
        Get appropriate tick size for symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Tick size as Decimal
        """
        # Common tick sizes based on symbol patterns
        if "BTC" in symbol.upper():
            return Decimal("0.01")  # $0.01 for BTC pairs
        elif "ETH" in symbol.upper():
            return Decimal("0.01")  # $0.01 for ETH pairs
        elif "USDT" in symbol.upper() or "USDC" in symbol.upper():
            return Decimal("0.001")  # $0.001 for stablecoin pairs
        else:
            return Decimal("0.0001")  # Default smaller tick size
