"""
Volume Profile Service Example - Complete demonstration.

This example shows how to use the Volume Profile Service to:
1. Calculate volume profiles for different timeframes
2. Get real-time volume profile updates
3. Analyze historical volume distribution patterns
4. Extract key levels (POC, VAH, VAL)
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our services and entities
from src.core.entities import Trade, VolumeProfile
from src.core.types import Symbol, Exchange, Side
from src.application.services.volume_profile_service import VolumeProfileService
from src.infrastructure.database.repositories import TradeRepository


class MockTradeRepository:
    """Mock trade repository for demonstration purposes."""
    
    def __init__(self):
        """Initialize with sample trade data."""
        self.trades = self._generate_sample_trades()
    
    def _generate_sample_trades(self) -> List[Trade]:
        """Generate realistic sample trades for BTCUSDT."""
        trades = []
        base_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
        base_price = Decimal("50000.00")
        
        # Generate 1 hour of trades with realistic price movement
        for i in range(200):  # 200 trades over 1 hour
            # Create some price volatility
            price_offset = Decimal(str((i % 20 - 10) * 5))  # +/- 50 price movement
            noise = Decimal(str((i % 7 - 3) * 2))  # Small random noise
            price = base_price + price_offset + noise
            
            # Volume varies based on price level
            if abs(float(price_offset)) < 10:  # Near base price
                quantity = Decimal("1.5") + Decimal(str(i % 10)) / 10
            else:
                quantity = Decimal("0.5") + Decimal(str(i % 5)) / 10
            
            # Determine side (slightly more buys near lower prices)
            side = Side.BUY if (price < base_price or i % 3 == 0) else Side.SELL
            
            trade = Trade(
                id=str(i),
                symbol="BTCUSDT",
                exchange="binance",
                price=price,
                quantity=quantity,
                side=side,
                timestamp=base_time + timedelta(minutes=i * 0.3),  # 18 seconds per trade
                is_buyer_maker=(i % 4 == 0)
            )
            trades.append(trade)
        
        return trades
    
    async def find_by_time_range(
        self, 
        symbol: Symbol, 
        exchange: Exchange, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[Trade]:
        """Find trades within time range."""
        filtered_trades = [
            trade for trade in self.trades
            if (trade.symbol == symbol and 
                trade.exchange == exchange and
                start_time <= trade.timestamp <= end_time)
        ]
        
        logger.info(f"Found {len(filtered_trades)} trades for {symbol} between {start_time} and {end_time}")
        return filtered_trades


async def demonstrate_basic_calculation():
    """Demonstrate basic volume profile calculation."""
    print("\n" + "="*60)
    print("1. BASIC VOLUME PROFILE CALCULATION")
    print("="*60)
    
    # Setup
    repository = MockTradeRepository()
    service = VolumeProfileService(repository)
    
    # Calculate volume profile for 1 hour
    start_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
    end_time = start_time + timedelta(hours=1)
    
    volume_profile = await service.calculate_volume_profile(
        symbol="BTCUSDT",
        exchange="binance",
        start_time=start_time,
        end_time=end_time
    )
    
    if volume_profile:
        print(f"Symbol: {volume_profile.symbol}")
        print(f"Exchange: {volume_profile.exchange}")
        print(f"Period: {volume_profile.start_time} to {volume_profile.end_time}")
        print(f"Total Volume: {volume_profile.total_volume}")
        print(f"POC (Point of Control): ${volume_profile.poc_price}")
        print(f"VAH (Value Area High): ${volume_profile.vah_price}")
        print(f"VAL (Value Area Low): ${volume_profile.val_price}")
        print(f"Value Area Volume: {volume_profile.value_area_volume} ({float(volume_profile.value_area_volume / volume_profile.total_volume * 100):.1f}%)")
        
        # Show top 5 price levels by volume
        print("\nTop 5 Price Levels by Volume:")
        price_volumes = [(Decimal(price), volume) for price, volume in volume_profile.price_levels.items()]
        top_levels = sorted(price_volumes, key=lambda x: x[1], reverse=True)[:5]
        
        for i, (price, volume) in enumerate(top_levels, 1):
            percentage = float(volume / volume_profile.total_volume * 100)
            print(f"  {i}. ${price}: {volume} ({percentage:.1f}%)")
    else:
        print("No volume profile data available")


async def demonstrate_real_time_updates():
    """Demonstrate real-time volume profile updates."""
    print("\n" + "="*60)
    print("2. REAL-TIME VOLUME PROFILE UPDATES")
    print("="*60)
    
    repository = MockTradeRepository()
    service = VolumeProfileService(repository)
    
    # Simulate real-time updates for different timeframes
    timeframes = [60, 240, 1440]  # 1h, 4h, 1d
    timeframe_names = ["1 hour", "4 hours", "1 day"]
    
    for timeframe_minutes, name in zip(timeframes, timeframe_names):
        print(f"\n{name.upper()} TIMEFRAME:")
        
        profile = await service.calculate_real_time_profile(
            symbol="BTCUSDT",
            exchange="binance",
            timeframe_minutes=timeframe_minutes
        )
        
        if profile:
            print(f"  POC: ${profile.poc_price}")
            print(f"  VAH: ${profile.vah_price}")
            print(f"  VAL: ${profile.val_price}")
            print(f"  Total Volume: {profile.total_volume}")
            
            # Calculate value area percentage
            va_percentage = float(profile.value_area_volume / profile.total_volume * 100)
            print(f"  Value Area: {va_percentage:.1f}% of total volume")
        else:
            print(f"  No data available for {name}")


async def demonstrate_historical_analysis():
    """Demonstrate historical volume profile analysis."""
    print("\n" + "="*60)
    print("3. HISTORICAL VOLUME PROFILE ANALYSIS")
    print("="*60)
    
    repository = MockTradeRepository()
    service = VolumeProfileService(repository)
    
    # Get last 5 hours of volume profiles
    profiles = await service.get_historical_profiles(
        symbol="BTCUSDT",
        exchange="binance",
        timeframe_minutes=60,
        periods=5
    )
    
    if profiles:
        print(f"Retrieved {len(profiles)} historical profiles:\n")
        
        # Analyze POC movement
        poc_prices = [float(profile.poc_price) for profile in profiles]
        avg_poc = sum(poc_prices) / len(poc_prices)
        poc_range = max(poc_prices) - min(poc_prices)
        
        print("POC ANALYSIS:")
        print(f"  Average POC: ${avg_poc:.2f}")
        print(f"  POC Range: ${poc_range:.2f}")
        print(f"  Current POC: ${poc_prices[0]:.2f}")
        
        # Show trend
        if len(poc_prices) >= 2:
            recent_trend = "rising" if poc_prices[0] > poc_prices[1] else "falling"
            print(f"  Recent Trend: {recent_trend}")
        
        print("\nHISTORICAL PROFILES:")
        for i, profile in enumerate(profiles):
            time_ago = f"{i} hours ago" if i > 0 else "Current"
            va_pct = float(profile.value_area_volume / profile.total_volume * 100)
            print(f"  {time_ago:12}: POC=${profile.poc_price}, VAH=${profile.vah_price}, VAL=${profile.val_price}, VA={va_pct:.1f}%")
    else:
        print("No historical profiles available")


async def demonstrate_advanced_analysis():
    """Demonstrate advanced volume profile analysis."""
    print("\n" + "="*60)
    print("4. ADVANCED VOLUME PROFILE ANALYSIS")
    print("="*60)
    
    repository = MockTradeRepository()
    service = VolumeProfileService(repository)
    
    # Get current profile
    current_profile = await service.calculate_real_time_profile(
        symbol="BTCUSDT",
        exchange="binance",
        timeframe_minutes=60
    )
    
    if current_profile:
        # Analyze volume distribution
        price_volumes = [(Decimal(price), volume) for price, volume in current_profile.price_levels.items()]
        total_volume = current_profile.total_volume
        
        print("VOLUME DISTRIBUTION ANALYSIS:")
        
        # Find volume concentration
        sorted_by_volume = sorted(price_volumes, key=lambda x: x[1], reverse=True)
        top_20_percent_count = max(1, len(sorted_by_volume) // 5)
        top_20_percent_volume = sum(volume for _, volume in sorted_by_volume[:top_20_percent_count])
        concentration = float(top_20_percent_volume / total_volume * 100)
        
        print(f"  Volume Concentration: {concentration:.1f}% of volume in top 20% of prices")
        
        # Analyze price range efficiency
        prices = [price for price, _ in price_volumes]
        price_range = max(prices) - min(prices)
        value_area_range = current_profile.vah_price - current_profile.val_price
        efficiency = float(value_area_range / price_range * 100) if price_range > 0 else 0
        
        print(f"  Price Range Efficiency: {efficiency:.1f}% (value area vs total range)")
        
        # Key levels analysis
        poc = current_profile.poc_price
        vah = current_profile.vah_price
        val = current_profile.val_price
        
        print(f"\nKEY LEVELS ANALYSIS:")
        print(f"  POC (Point of Control): ${poc}")
        print(f"  VAH (Value Area High):  ${vah}")
        print(f"  VAL (Value Area Low):   ${val}")
        print(f"  Value Area Range:       ${vah - val}")
        
        # Support/Resistance levels
        print(f"\nPOTENTIAL LEVELS:")
        print(f"  Strong Support:    ${val} (Value Area Low)")
        print(f"  Key Level:         ${poc} (Point of Control)")
        print(f"  Strong Resistance: ${vah} (Value Area High)")
        
        # Volume profile insights
        print(f"\nTRADING INSIGHTS:")
        
        if concentration > 40:
            print("  • High volume concentration - Strong institutional interest")
        else:
            print("  • Distributed volume - Balanced trading activity")
        
        if efficiency > 70:
            print("  • Efficient price discovery - Value area is tight")
        else:
            print("  • Wide price distribution - Uncertain value area")
        
        # Price position relative to value area
        current_price = poc  # Using POC as proxy for current price
        if current_price >= vah:
            print("  • Price above value area - Potential resistance zone")
        elif current_price <= val:
            print("  • Price below value area - Potential support zone")
        else:
            print("  • Price within value area - Balanced trading range")


async def demonstrate_custom_calculations():
    """Demonstrate custom volume profile calculations."""
    print("\n" + "="*60)
    print("5. CUSTOM VOLUME PROFILE CALCULATIONS")
    print("="*60)
    
    repository = MockTradeRepository()
    service = VolumeProfileService(repository)
    
    # Test different value area percentages
    start_time = datetime(2025, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
    end_time = start_time + timedelta(hours=1)
    
    value_area_percentages = [Decimal("0.60"), Decimal("0.70"), Decimal("0.80")]
    
    print("COMPARISON OF DIFFERENT VALUE AREA PERCENTAGES:")
    
    for va_pct in value_area_percentages:
        profile = await service.calculate_volume_profile(
            symbol="BTCUSDT",
            exchange="binance",
            start_time=start_time,
            end_time=end_time,
            value_area_percentage=va_pct
        )
        
        if profile:
            pct_display = int(float(va_pct * 100))
            va_range = profile.vah_price - profile.val_price
            print(f"\n  {pct_display}% Value Area:")
            print(f"    VAH: ${profile.vah_price}")
            print(f"    VAL: ${profile.val_price}")
            print(f"    Range: ${va_range}")
            print(f"    Volume: {profile.value_area_volume}")
    
    # Test different tick sizes
    print(f"\nTICK SIZE ANALYSIS:")
    
    symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    for symbol in symbols:
        calculator = service.get_calculator(symbol)
        tick_size = calculator.tick_size
        print(f"  {symbol}: {tick_size}")


async def main():
    """Run all demonstrations."""
    print("VOLUME PROFILE SERVICE DEMONSTRATION")
    print("=" * 60)
    print("This example demonstrates the complete Volume Profile Service")
    print("functionality with realistic trading data scenarios.")
    
    try:
        await demonstrate_basic_calculation()
        await demonstrate_real_time_updates()
        await demonstrate_historical_analysis()
        await demonstrate_advanced_analysis()
        await demonstrate_custom_calculations()
        
        print("\n" + "="*60)
        print("DEMONSTRATION COMPLETED SUCCESSFULLY")
        print("="*60)
        print("\nKey Features Demonstrated:")
        print("• Basic volume profile calculation (POC, VAH, VAL)")
        print("• Real-time updates for multiple timeframes")
        print("• Historical analysis and trend identification")
        print("• Advanced volume distribution analysis")
        print("• Custom value area percentages")
        print("• Automatic tick size selection")
        print("• Trading insights and key levels")
        
    except Exception as e:
        logger.error(f"Demonstration failed: {e}", exc_info=True)
        print(f"\nERROR: {e}")


if __name__ == "__main__":
    asyncio.run(main())
