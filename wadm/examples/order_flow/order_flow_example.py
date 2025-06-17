"""
Order Flow Analysis Example - Comprehensive Demo

This example demonstrates the complete Order Flow analysis capabilities of WADM:
- Real-time order flow monitoring
- Historical analysis and trends
- Delta tracking and momentum
- Absorption and imbalance detection
- Trading insights and signals

Run this example to see order flow analysis in action with realistic market data.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import WADM components
from src.core.entities import TradeData, Symbol, Exchange, TimeFrame
from src.core.algorithms.order_flow_calculator import OrderFlowCalculator, TradeType
from src.application.services.order_flow_service import OrderFlowService
from src.application.use_cases.order_flow import (
    CalculateOrderFlowUseCase,
    CalculateOrderFlowRequest,
    GetRealTimeOrderFlowUseCase,
    GetRealTimeOrderFlowRequest,
    GetOrderFlowSeriesUseCase,
    GetOrderFlowSeriesRequest,
)


class OrderFlowDataGenerator:
    """Generate realistic order flow data for demonstration."""
    
    def __init__(self, base_price: Decimal = Decimal('50000.00')):
        self.base_price = base_price
        self.current_price = base_price
        self.trade_id_counter = 0
    
    def generate_realistic_trading_session(self, duration_minutes: int = 60) -> List[TradeData]:
        """
        Generate realistic trading session with various market conditions.
        
        Simulates:
        - Opening with balanced trading
        - Mid-session with strong buying pressure
        - Late session with profit-taking and selling pressure
        - Various trade sizes and patterns
        """
        trades = []
        base_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
        
        # Phase 1: Balanced opening (20% of time)
        phase1_duration = int(duration_minutes * 0.2)
        trades.extend(self._generate_balanced_phase(base_time, phase1_duration))
        
        # Phase 2: Strong buying pressure (40% of time) 
        phase2_start = base_time + timedelta(minutes=phase1_duration)
        phase2_duration = int(duration_minutes * 0.4)
        trades.extend(self._generate_buying_pressure_phase(phase2_start, phase2_duration))
        
        # Phase 3: Profit taking / selling pressure (30% of time)
        phase3_start = phase2_start + timedelta(minutes=phase2_duration)
        phase3_duration = int(duration_minutes * 0.3)
        trades.extend(self._generate_selling_pressure_phase(phase3_start, phase3_duration))
        
        # Phase 4: Final consolidation (10% of time)
        phase4_start = phase3_start + timedelta(minutes=phase3_duration)
        phase4_duration = duration_minutes - phase1_duration - phase2_duration - phase3_duration
        trades.extend(self._generate_consolidation_phase(phase4_start, phase4_duration))
        
        logger.info(f"Generated {len(trades)} trades across {duration_minutes} minutes")
        return sorted(trades, key=lambda t: t.timestamp)
    
    def _generate_balanced_phase(self, start_time: datetime, duration: int) -> List[TradeData]:
        """Generate balanced trading with equal buy/sell pressure."""
        trades = []
        
        for minute in range(duration):
            for trade_num in range(5):  # 5 trades per minute
                timestamp = start_time + timedelta(minutes=minute, seconds=trade_num * 12)
                
                # Alternate between slight price increases and decreases
                if trade_num % 2 == 0:
                    self.current_price += Decimal('0.50')  # Small uptick
                    volume = Decimal('0.8') + Decimal(str(trade_num)) * Decimal('0.1')
                else:
                    self.current_price -= Decimal('0.30')  # Small downtick
                    volume = Decimal('0.7') + Decimal(str(trade_num)) * Decimal('0.1')
                
                trades.append(self._create_trade(timestamp, self.current_price, volume))
        
        return trades
    
    def _generate_buying_pressure_phase(self, start_time: datetime, duration: int) -> List[TradeData]:
        """Generate strong buying pressure with larger buy orders."""
        trades = []
        
        for minute in range(duration):
            # More frequent trades during buying pressure
            for trade_num in range(8):
                timestamp = start_time + timedelta(minutes=minute, seconds=trade_num * 7.5)
                
                # 70% chance of price increase (buy pressure)
                if trade_num < 6:  # 6 out of 8 trades are buys
                    price_change = Decimal('1.0') + Decimal(str(trade_num % 3)) * Decimal('0.5')
                    self.current_price += price_change
                    volume = Decimal('1.2') + Decimal(str(trade_num % 4)) * Decimal('0.3')
                    
                    # Occasional large buy order
                    if trade_num == 3:
                        volume *= Decimal('5.0')  # Large buy order
                else:
                    # Small sell orders
                    self.current_price -= Decimal('0.20')
                    volume = Decimal('0.4') + Decimal(str(trade_num % 2)) * Decimal('0.1')
                
                trades.append(self._create_trade(timestamp, self.current_price, volume))
        
        return trades
    
    def _generate_selling_pressure_phase(self, start_time: datetime, duration: int) -> List[TradeData]:
        """Generate selling pressure with profit-taking."""
        trades = []
        
        for minute in range(duration):
            for trade_num in range(6):
                timestamp = start_time + timedelta(minutes=minute, seconds=trade_num * 10)
                
                # 65% chance of price decrease (sell pressure)
                if trade_num < 4:  # 4 out of 6 trades are sells
                    price_change = Decimal('0.8') + Decimal(str(trade_num % 3)) * Decimal('0.4')
                    self.current_price -= price_change
                    volume = Decimal('1.0') + Decimal(str(trade_num % 3)) * Decimal('0.4')
                    
                    # Occasional large sell order (profit taking)
                    if trade_num == 2:
                        volume *= Decimal('4.0')  # Large sell order
                else:
                    # Small buy orders (support)
                    self.current_price += Decimal('0.15')
                    volume = Decimal('0.5') + Decimal(str(trade_num % 2)) * Decimal('0.2')
                
                trades.append(self._create_trade(timestamp, self.current_price, volume))
        
        return trades
    
    def _generate_consolidation_phase(self, start_time: datetime, duration: int) -> List[TradeData]:
        """Generate consolidation with balanced small trades."""
        trades = []
        
        for minute in range(duration):
            for trade_num in range(3):  # Lower frequency
                timestamp = start_time + timedelta(minutes=minute, seconds=trade_num * 20)
                
                # Small random price movements
                if trade_num % 2 == 0:
                    self.current_price += Decimal('0.10')
                else:
                    self.current_price -= Decimal('0.10')
                
                volume = Decimal('0.3') + Decimal(str(trade_num)) * Decimal('0.1')
                trades.append(self._create_trade(timestamp, self.current_price, volume))
        
        return trades
    
    def _create_trade(self, timestamp: datetime, price: Decimal, volume: Decimal) -> TradeData:
        """Create a TradeData instance."""
        self.trade_id_counter += 1
        return TradeData(
            symbol="BTCUSDT",
            exchange="bybit",
            price=price,
            volume=volume,
            timestamp=timestamp,
            trade_id=str(self.trade_id_counter)
        )


class MockTradeRepository:
    """Mock repository for demonstration purposes."""
    
    def __init__(self, trades: List[TradeData]):
        self.trades = sorted(trades, key=lambda t: t.timestamp)
    
    async def get_trades_in_range(
        self,
        symbol: Symbol,
        exchange: Exchange,
        start_time: datetime,
        end_time: datetime
    ) -> List[TradeData]:
        """Get trades within time range."""
        return [
            trade for trade in self.trades
            if start_time <= trade.timestamp <= end_time
        ]


class MockRedisCache:
    """Mock Redis cache for demonstration."""
    
    def __init__(self):
        self.cache = {}
    
    async def get_order_flow(self, key: str):
        return self.cache.get(key)
    
    async def set_order_flow(self, key: str, value, ttl: int = None):
        self.cache[key] = value
    
    async def get(self, key: str):
        return self.cache.get(key)
    
    async def set(self, key: str, value, ttl: int = None):
        self.cache[key] = value


async def demonstrate_order_flow_calculator():
    """Demonstrate the OrderFlowCalculator with realistic data."""
    print("\n" + "="*80)
    print("🔄 ORDER FLOW CALCULATOR DEMONSTRATION")
    print("="*80)
    
    # Generate realistic trading data
    generator = OrderFlowDataGenerator()
    trades = generator.generate_realistic_trading_session(60)
    
    # Initialize calculator
    calculator = OrderFlowCalculator(
        tick_size=Decimal('0.01'),
        absorption_threshold=3.0,
        imbalance_threshold=2.0,
        large_trade_threshold=5.0
    )
    
    # Calculate order flow
    print("\n📊 Calculating order flow profile...")
    profile = calculator.calculate_order_flow(
        trades=trades,
        symbol="BTCUSDT",
        exchange="bybit",
        timeframe="1h"
    )
    
    # Display results
    print(f"\n📈 ORDER FLOW ANALYSIS RESULTS")
    print(f"Symbol: {profile.symbol}")
    print(f"Exchange: {profile.exchange}")
    print(f"Timeframe: {profile.timeframe}")
    print(f"Period: {profile.start_time} to {profile.end_time}")
    print()
    
    print(f"📊 VOLUME METRICS:")
    print(f"  Total Volume: {profile.total_volume:,.2f}")
    print(f"  Total Trades: {profile.total_trades:,}")
    print(f"  Average Trade Size: {profile.avg_trade_size:.4f}")
    print()
    
    print(f"💰 ORDER FLOW METRICS:")
    print(f"  Buy Volume: {profile.total_buy_volume:,.2f} ({profile.buy_percentage:.1f}%)")
    print(f"  Sell Volume: {profile.total_sell_volume:,.2f} ({profile.sell_percentage:.1f}%)")
    print(f"  Net Delta: {profile.net_delta:+,.2f}")
    print(f"  Cumulative Delta: {profile.cumulative_delta:+,.2f}")
    print(f"  Delta Momentum: {profile.delta_momentum:+.1f}%")
    print()
    
    print(f"⚖️ MARKET EFFICIENCY:")
    print(f"  Efficiency Score: {profile.market_efficiency:.1f}%")
    print(f"  Market Condition: {'Balanced' if profile.market_efficiency > 70 else 'Imbalanced'}")
    print()
    
    print(f"🎯 PRICE LEVEL ANALYSIS:")
    print(f"  Total Price Levels: {len(profile.levels)}")
    
    # Show top 5 levels by volume
    top_levels = sorted(profile.levels, key=lambda l: l.buy_volume + l.sell_volume, reverse=True)[:5]
    for i, level in enumerate(top_levels, 1):
        total_vol = level.buy_volume + level.sell_volume
        print(f"  Level {i}: ${level.price:,.2f} - Vol: {total_vol:.2f} "
              f"(Buy: {level.buy_volume:.2f}, Sell: {level.sell_volume:.2f}, "
              f"Delta: {level.delta:+.2f})")
    
    print(f"\n🚨 DETECTED EVENTS:")
    print(f"  Absorption Events: {len(profile.absorption_events)}")
    for event in profile.absorption_events[:3]:  # Show first 3
        print(f"    ${event.price:,.2f} - {event.absorption_type.value.upper()} absorption "
              f"(Strength: {event.strength:.1f}%, Volume: {event.absorbed_volume:.2f})")
    
    print(f"  Imbalance Events: {len(profile.imbalance_events)}")
    for event in profile.imbalance_events[:3]:  # Show first 3
        print(f"    ${event.price_start:,.2f}-${event.price_end:,.2f} - "
              f"{event.direction.value.upper()} imbalance "
              f"(Strength: {event.strength:.1f}%, Ratio: {event.imbalance_ratio:.1f})")


async def demonstrate_order_flow_service():
    """Demonstrate the OrderFlowService with use cases."""
    print("\n" + "="*80)
    print("🏗️ ORDER FLOW SERVICE DEMONSTRATION")
    print("="*80)
    
    # Generate data and setup
    generator = OrderFlowDataGenerator()
    trades = generator.generate_realistic_trading_session(120)  # 2 hours
    
    mock_repo = MockTradeRepository(trades)
    mock_cache = MockRedisCache()
    
    # Test Real-Time Order Flow Use Case
    print("\n🔴 REAL-TIME ORDER FLOW ANALYSIS")
    print("-" * 50)
    
    use_case = GetRealTimeOrderFlowUseCase(
        trade_repository=mock_repo,
        cache=mock_cache
    )
    
    request = GetRealTimeOrderFlowRequest(
        symbol=Symbol.BTCUSDT,
        exchange=Exchange.BYBIT,
        timeframe=TimeFrame.FIVE_MINUTES,
        use_orderbook=False
    )
    
    response = await use_case.execute(request)
    
    print(f"Market Condition: {response.market_condition}")
    print(f"Active Signals: {', '.join(response.signals) if response.signals else 'None'}")
    print(f"Net Delta: {response.order_flow.net_delta:+,.2f}")
    print(f"Buy Pressure: {response.order_flow.buy_percentage:.1f}%")
    print(f"Market Efficiency: {response.order_flow.market_efficiency:.1f}%")
    
    # Test Historical Series Analysis
    print("\n📈 HISTORICAL ORDER FLOW SERIES")
    print("-" * 50)
    
    series_use_case = GetOrderFlowSeriesUseCase(
        trade_repository=mock_repo,
        cache=mock_cache
    )
    
    series_request = GetOrderFlowSeriesRequest(
        symbol=Symbol.BTCUSDT,
        exchange=Exchange.BYBIT,
        timeframe=TimeFrame.FIVE_MINUTES,
        periods=12
    )
    
    series_response = await series_use_case.execute(series_request)
    
    print(f"Periods Analyzed: {len(series_response.profiles)}")
    print(f"Delta Trend: {series_response.trends.get('delta_trend', 'unknown')}")
    print(f"Average Buy %: {series_response.trends.get('avg_buy_percentage', 0):.1f}%")
    print(f"Periods with Absorption: {series_response.trends.get('periods_with_absorption', 0)}")
    print(f"Periods with Imbalance: {series_response.trends.get('periods_with_imbalance', 0)}")
    
    # Test Custom Period Analysis
    print("\n⏰ CUSTOM PERIOD ANALYSIS")
    print("-" * 50)
    
    calc_use_case = CalculateOrderFlowUseCase(
        trade_repository=mock_repo,
        cache=mock_cache
    )
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(minutes=30)
    
    calc_request = CalculateOrderFlowRequest(
        symbol=Symbol.BTCUSDT,
        exchange=Exchange.BYBIT,
        start_time=start_time,
        end_time=end_time,
        timeframe=TimeFrame.FIVE_MINUTES,
        use_orderbook=False
    )
    
    calc_response = await calc_use_case.execute(calc_request)
    
    print(f"Flow Direction: {calc_response.analysis.get('flow_direction', 'unknown')}")
    print(f"Flow Strength: {calc_response.analysis.get('flow_strength', 0):.1f}%")
    print(f"Market Balance: {calc_response.analysis.get('market_balance', 'unknown')}")
    print(f"Dominant Side: {calc_response.analysis.get('dominant_side', 'unknown')}")
    print(f"Trade Intensity: {calc_response.analysis.get('trade_intensity', 'unknown')}")


async def demonstrate_trading_insights():
    """Demonstrate trading insights derived from order flow."""
    print("\n" + "="*80)
    print("💡 TRADING INSIGHTS FROM ORDER FLOW")
    print("="*80)
    
    # Generate specific scenarios
    generator = OrderFlowDataGenerator()
    
    # Scenario 1: Strong buying pressure
    print("\n📊 SCENARIO 1: Strong Buying Pressure")
    print("-" * 50)
    
    buy_pressure_trades = generator._generate_buying_pressure_phase(datetime.utcnow() - timedelta(minutes=30), 30)
    calculator = OrderFlowCalculator()
    
    buy_profile = calculator.calculate_order_flow(buy_pressure_trades, "BTCUSDT", "bybit")
    
    print(f"Net Delta: {buy_profile.net_delta:+,.2f}")
    print(f"Buy Percentage: {buy_profile.buy_percentage:.1f}%")
    print(f"Delta Momentum: {buy_profile.delta_momentum:+.1f}%")
    
    # Generate trading insights
    if buy_profile.buy_percentage > 65:
        print("🟢 BULLISH SIGNAL: Strong buying pressure detected")
        print("   • Consider long positions")
        print("   • Watch for continuation patterns")
        print("   • Monitor for absorption at resistance levels")
    
    if buy_profile.delta_momentum > 30:
        print("🚀 MOMENTUM SIGNAL: Accelerating buy pressure")
        print("   • Momentum is building")
        print("   • Early entry opportunity")
    
    if len(buy_profile.absorption_events) > 0:
        for event in buy_profile.absorption_events[:2]:
            print(f"⚠️  ABSORPTION at ${event.price:,.2f}: "
                  f"{event.absorption_type.value} orders being absorbed")
    
    # Scenario 2: Market efficiency analysis
    print("\n⚖️ SCENARIO 2: Market Efficiency Analysis")
    print("-" * 50)
    
    balanced_trades = generator._generate_balanced_phase(datetime.utcnow() - timedelta(minutes=20), 20)
    balanced_profile = calculator.calculate_order_flow(balanced_trades, "BTCUSDT", "bybit")
    
    print(f"Market Efficiency: {balanced_profile.market_efficiency:.1f}%")
    print(f"Buy/Sell Balance: {balanced_profile.buy_percentage:.1f}% / {balanced_profile.sell_percentage:.1f}%")
    
    if balanced_profile.market_efficiency > 80:
        print("🟡 BALANCED MARKET: High efficiency detected")
        print("   • Range-bound trading likely")
        print("   • Look for breakout setups")
        print("   • Scalping opportunities available")
    elif balanced_profile.market_efficiency < 50:
        print("🔴 IMBALANCED MARKET: Low efficiency detected")
        print("   • Strong directional bias")
        print("   • Trend continuation likely")
        print("   • Avoid counter-trend trades")


async def demonstrate_real_time_monitoring():
    """Demonstrate real-time order flow monitoring concept."""
    print("\n" + "="*80)
    print("📡 REAL-TIME ORDER FLOW MONITORING CONCEPT")
    print("="*80)
    
    print("\n🔄 Simulating real-time order flow updates...")
    
    calculator = OrderFlowCalculator()
    generator = OrderFlowDataGenerator()
    
    # Simulate 5 minutes of real-time updates
    base_time = datetime.utcnow()
    
    for minute in range(5):
        current_time = base_time + timedelta(minutes=minute)
        print(f"\n⏰ Minute {minute + 1} - {current_time.strftime('%H:%M:%S')}")
        
        # Generate 1 minute of trades
        minute_trades = []
        for second in range(0, 60, 10):  # Every 10 seconds
            timestamp = current_time + timedelta(seconds=second)
            
            # Simulate different market conditions each minute
            if minute < 2:  # First 2 minutes: buying pressure
                price_change = Decimal('1.0')
                volume = Decimal('1.5')
            elif minute < 4:  # Next 2 minutes: selling pressure  
                price_change = -Decimal('0.8')
                volume = Decimal('1.2')
            else:  # Last minute: balanced
                price_change = Decimal('0.1') if second % 20 == 0 else -Decimal('0.1')
                volume = Decimal('0.8')
            
            generator.current_price += price_change
            minute_trades.append(generator._create_trade(timestamp, generator.current_price, volume))
        
        # Calculate order flow for this minute
        profile = calculator.calculate_order_flow(minute_trades, "BTCUSDT", "bybit", "1m")
        
        # Display key metrics
        print(f"   Net Delta: {profile.net_delta:+.2f}")
        print(f"   Buy%: {profile.buy_percentage:.1f}% | Sell%: {profile.sell_percentage:.1f}%")
        print(f"   Efficiency: {profile.market_efficiency:.1f}%")
        
        # Simple alerts
        if abs(profile.delta_momentum) > 50:
            direction = "UP" if profile.delta_momentum > 0 else "DOWN"
            print(f"   🚨 MOMENTUM ALERT: Strong {direction} momentum detected!")
        
        if profile.market_efficiency < 40:
            bias = "BUY" if profile.buy_percentage > profile.sell_percentage else "SELL"
            print(f"   ⚠️  IMBALANCE ALERT: Strong {bias} imbalance detected!")
        
        # Simulate processing delay
        await asyncio.sleep(0.5)


async def main():
    """Run all order flow demonstrations."""
    print("🎯 WADM ORDER FLOW ANALYSIS - COMPREHENSIVE DEMONSTRATION")
    print("="*80)
    print("This demo showcases the complete Order Flow analysis capabilities:")
    print("• Buy/Sell classification and delta calculation")
    print("• Absorption and imbalance detection")
    print("• Market efficiency analysis")
    print("• Trading insights and signals")
    print("• Real-time monitoring simulation")
    
    try:
        # Run all demonstrations
        await demonstrate_order_flow_calculator()
        await demonstrate_order_flow_service()
        await demonstrate_trading_insights()
        await demonstrate_real_time_monitoring()
        
        print(f"\n✅ ORDER FLOW DEMONSTRATION COMPLETED SUCCESSFULLY!")
        print("\n📝 Key Takeaways:")
        print("• Order flow analysis provides deep insights into market dynamics")
        print("• Delta tracking reveals buying/selling pressure")
        print("• Absorption detection identifies institutional activity")
        print("• Market efficiency helps determine trading strategies")
        print("• Real-time monitoring enables timely decision making")
        
    except Exception as e:
        print(f"\n❌ Error during demonstration: {e}")
        logger.exception("Demonstration failed")


if __name__ == "__main__":
    asyncio.run(main())
