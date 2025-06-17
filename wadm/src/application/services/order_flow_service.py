"""
Order Flow Service for analyzing buy/sell pressure, delta, and market dynamics.

This service provides high-level order flow analysis including:
- Real-time order flow calculations
- Historical order flow analysis
- Delta tracking and momentum
- Absorption and imbalance detection
- WebSocket streaming capabilities
"""

from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, timedelta
import logging
import asyncio

from ...core.algorithms.order_flow_calculator import (
    OrderFlowCalculator,
    OrderFlowProfile,
    TradeType,
    AbsorptionEvent,
    ImbalanceEvent
)
from ...core.entities import TradeData, OrderBookData, Symbol, Exchange, TimeFrame
from ...infrastructure.database.repositories import TradeRepository, OrderBookRepository
from ...infrastructure.cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)


class OrderFlowService:
    """
    Service for comprehensive order flow analysis.
    
    Features:
    - Real-time order flow calculations
    - Historical analysis with caching
    - Delta momentum tracking
    - Absorption and imbalance detection
    - Multi-timeframe analysis
    - WebSocket streaming support
    """
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        orderbook_repository: Optional[OrderBookRepository] = None,
        cache: Optional[RedisCache] = None,
        calculator: Optional[OrderFlowCalculator] = None
    ):
        self.trade_repository = trade_repository
        self.orderbook_repository = orderbook_repository
        self.cache = cache
        self.calculator = calculator or OrderFlowCalculator()
        
        logger.info("OrderFlowService initialized")
    
    async def get_real_time_order_flow(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        use_orderbook: bool = True
    ) -> OrderFlowProfile:
        """
        Get real-time order flow analysis for the current/latest period.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            use_orderbook: Whether to use orderbook data for better classification
            
        Returns:
            OrderFlowProfile with current order flow analysis
        """
        cache_key = f"order_flow:realtime:{symbol.value}:{exchange.value}:{timeframe.value}"
        
        # Try cache first (30 second TTL for real-time)
        if self.cache:
            cached_result = await self.cache.get_order_flow(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for real-time order flow: {cache_key}")
                return cached_result
        
        # Calculate time range for current period
        now = datetime.utcnow()
        timeframe_minutes = self._timeframe_to_minutes(timeframe)
        period_start = now.replace(
            minute=(now.minute // timeframe_minutes) * timeframe_minutes,
            second=0,
            microsecond=0
        )
        
        # Get trades for current period
        trades = await self.trade_repository.get_trades_in_range(
            symbol=symbol,
            exchange=exchange,
            start_time=period_start,
            end_time=now
        )
        
        # Get orderbook snapshots if requested
        orderbooks = None
        if use_orderbook and self.orderbook_repository and trades:
            orderbooks = await self._get_orderbook_snapshots_for_trades(
                trades, symbol, exchange
            )
        
        # Calculate order flow
        order_flow = self.calculator.calculate_order_flow(
            trades=trades,
            symbol=symbol.value,
            exchange=exchange.value,
            timeframe=timeframe.value,
            orderbooks=orderbooks
        )
        
        # Cache result
        if self.cache:
            await self.cache.set_order_flow(cache_key, order_flow, ttl=30)
        
        logger.info(f"Real-time order flow calculated for {symbol.value}: "
                   f"net_delta={order_flow.net_delta}, "
                   f"buy_percentage={order_flow.buy_percentage:.1f}%")
        
        return order_flow
    
    async def get_historical_order_flow(
        self,
        symbol: Symbol,
        exchange: Exchange,
        start_time: datetime,
        end_time: datetime,
        timeframe: TimeFrame = TimeFrame.M5,
        use_orderbook: bool = False  # Too expensive for historical
    ) -> OrderFlowProfile:
        """
        Get historical order flow analysis for a specific time range.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            start_time: Start of analysis period
            end_time: End of analysis period
            timeframe: Analysis timeframe
            use_orderbook: Whether to use orderbook data (expensive for historical)
            
        Returns:
            OrderFlowProfile with historical analysis
        """
        cache_key = (f"order_flow:historical:{symbol.value}:{exchange.value}:"
                    f"{start_time.isoformat()}:{end_time.isoformat()}:{timeframe.value}")
        
        # Try cache first (5 minute TTL for historical)
        if self.cache:
            cached_result = await self.cache.get_order_flow(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for historical order flow: {cache_key}")
                return cached_result
        
        # Get trades for the specified range
        trades = await self.trade_repository.get_trades_in_range(
            symbol=symbol,
            exchange=exchange,
            start_time=start_time,
            end_time=end_time
        )
        
        # Get orderbook snapshots if requested (expensive!)
        orderbooks = None
        if use_orderbook and self.orderbook_repository and trades:
            logger.warning("Using orderbook for historical analysis - this may be slow")
            orderbooks = await self._get_orderbook_snapshots_for_trades(
                trades, symbol, exchange
            )
        
        # Calculate order flow
        order_flow = self.calculator.calculate_order_flow(
            trades=trades,
            symbol=symbol.value,
            exchange=exchange.value,
            timeframe=timeframe.value,
            orderbooks=orderbooks
        )
        
        # Cache result
        if self.cache:
            await self.cache.set_order_flow(cache_key, order_flow, ttl=300)
        
        logger.info(f"Historical order flow calculated for {symbol.value} "
                   f"({start_time} to {end_time}): "
                   f"total_trades={order_flow.total_trades}, "
                   f"net_delta={order_flow.net_delta}")
        
        return order_flow
    
    async def get_order_flow_series(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        periods: int = 24  # Number of periods to analyze
    ) -> List[OrderFlowProfile]:
        """
        Get a series of order flow profiles for multiple periods.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            periods: Number of periods to analyze
            
        Returns:
            List of OrderFlowProfile for each period
        """
        cache_key = (f"order_flow:series:{symbol.value}:{exchange.value}:"
                    f"{timeframe.value}:{periods}")
        
        # Try cache first
        if self.cache:
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                logger.debug(f"Cache hit for order flow series: {cache_key}")
                return cached_result
        
        timeframe_minutes = self._timeframe_to_minutes(timeframe)
        now = datetime.utcnow()
        
        # Calculate periods
        profiles = []
        for i in range(periods):
            period_end = now - timedelta(minutes=i * timeframe_minutes)
            period_start = period_end - timedelta(minutes=timeframe_minutes)
            
            # Get order flow for this period
            profile = await self.get_historical_order_flow(
                symbol=symbol,
                exchange=exchange,
                start_time=period_start,
                end_time=period_end,
                timeframe=timeframe,
                use_orderbook=False  # Too expensive for series
            )
            
            profiles.append(profile)
        
        # Reverse to get chronological order
        profiles.reverse()
        
        # Cache result
        if self.cache:
            await self.cache.set(cache_key, profiles, ttl=120)
        
        logger.info(f"Order flow series calculated for {symbol.value}: "
                   f"{len(profiles)} periods")
        
        return profiles
    
    async def detect_absorption_events(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        lookback_periods: int = 12
    ) -> List[AbsorptionEvent]:
        """
        Detect absorption events in recent periods.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            lookback_periods: Number of periods to analyze
            
        Returns:
            List of detected absorption events
        """
        profiles = await self.get_order_flow_series(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            periods=lookback_periods
        )
        
        # Collect all absorption events
        all_events = []
        for profile in profiles:
            all_events.extend(profile.absorption_events)
        
        # Sort by timestamp and strength
        all_events.sort(key=lambda e: (e.timestamp, -e.strength))
        
        logger.info(f"Detected {len(all_events)} absorption events for {symbol.value}")
        return all_events
    
    async def detect_imbalance_events(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        lookback_periods: int = 12
    ) -> List[ImbalanceEvent]:
        """
        Detect imbalance events in recent periods.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            lookback_periods: Number of periods to analyze
            
        Returns:
            List of detected imbalance events
        """
        profiles = await self.get_order_flow_series(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            periods=lookback_periods
        )
        
        # Collect all imbalance events
        all_events = []
        for profile in profiles:
            all_events.extend(profile.imbalance_events)
        
        # Sort by strength
        all_events.sort(key=lambda e: -e.strength)
        
        logger.info(f"Detected {len(all_events)} imbalance events for {symbol.value}")
        return all_events
    
    async def get_delta_momentum_analysis(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        periods: int = 24
    ) -> Dict[str, Any]:
        """
        Get delta momentum analysis across multiple periods.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            periods: Number of periods to analyze
            
        Returns:
            Dict with delta momentum analysis
        """
        profiles = await self.get_order_flow_series(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            periods=periods
        )
        
        if not profiles:
            return {
                "symbol": symbol.value,
                "exchange": exchange.value,
                "timeframe": timeframe.value,
                "periods_analyzed": 0,
                "cumulative_delta": 0,
                "avg_delta_momentum": 0,
                "trend": "neutral",
                "strength": 0
            }
        
        # Calculate metrics
        total_cumulative_delta = sum(float(p.cumulative_delta) for p in profiles)
        avg_delta_momentum = sum(p.delta_momentum for p in profiles) / len(profiles)
        
        # Determine trend
        recent_delta = sum(float(p.net_delta) for p in profiles[-6:])  # Last 6 periods
        older_delta = sum(float(p.net_delta) for p in profiles[:6])   # First 6 periods
        
        if recent_delta > older_delta * 1.2:
            trend = "bullish"
            strength = min(100, abs(recent_delta - older_delta) / max(abs(older_delta), 1) * 100)
        elif recent_delta < older_delta * 0.8:
            trend = "bearish" 
            strength = min(100, abs(older_delta - recent_delta) / max(abs(older_delta), 1) * 100)
        else:
            trend = "neutral"
            strength = 0
        
        return {
            "symbol": symbol.value,
            "exchange": exchange.value,
            "timeframe": timeframe.value,
            "periods_analyzed": len(profiles),
            "cumulative_delta": total_cumulative_delta,
            "avg_delta_momentum": avg_delta_momentum,
            "recent_delta": recent_delta,
            "older_delta": older_delta,
            "trend": trend,
            "strength": strength,
            "profiles": profiles[-5:]  # Last 5 periods for context
        }
    
    async def get_market_efficiency_score(
        self,
        symbol: Symbol,
        exchange: Exchange,
        timeframe: TimeFrame = TimeFrame.M5,
        periods: int = 12
    ) -> Dict[str, Any]:
        """
        Calculate market efficiency score based on buy/sell balance.
        
        Args:
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            periods: Number of periods to analyze
            
        Returns:
            Dict with efficiency analysis
        """
        profiles = await self.get_order_flow_series(
            symbol=symbol,
            exchange=exchange,
            timeframe=timeframe,
            periods=periods
        )
        
        if not profiles:
            return {
                "symbol": symbol.value,
                "efficiency_score": 100.0,
                "market_condition": "balanced",
                "periods_analyzed": 0
            }
        
        # Calculate average efficiency
        avg_efficiency = sum(p.market_efficiency for p in profiles) / len(profiles)
        
        # Determine market condition
        if avg_efficiency >= 80:
            condition = "highly_balanced"
        elif avg_efficiency >= 60:
            condition = "balanced"
        elif avg_efficiency >= 40:
            condition = "moderately_imbalanced"
        else:
            condition = "highly_imbalanced"
        
        return {
            "symbol": symbol.value,
            "exchange": exchange.value,
            "timeframe": timeframe.value,
            "periods_analyzed": len(profiles),
            "efficiency_score": avg_efficiency,
            "market_condition": condition,
            "buy_dominance": sum(p.buy_percentage for p in profiles) / len(profiles),
            "sell_dominance": sum(p.sell_percentage for p in profiles) / len(profiles)
        }
    
    # Helper methods
    async def _get_orderbook_snapshots_for_trades(
        self,
        trades: List[TradeData],
        symbol: Symbol,
        exchange: Exchange
    ) -> List[OrderBookData]:
        """Get orderbook snapshots corresponding to trade timestamps."""
        if not self.orderbook_repository or not trades:
            return []
        
        orderbooks = []
        for trade in trades:
            # Get orderbook closest to trade timestamp
            orderbook = await self.orderbook_repository.get_closest_orderbook(
                symbol=symbol,
                exchange=exchange,
                timestamp=trade.timestamp,
                max_time_diff=timedelta(seconds=5)  # 5 second tolerance
            )
            orderbooks.append(orderbook)
        
        return orderbooks
    
    def _timeframe_to_minutes(self, timeframe: TimeFrame) -> int:
        """Convert TimeFrame enum to minutes."""
        timeframe_map = {
            TimeFrame.M1: 1,
            TimeFrame.M5: 5,
            TimeFrame.M15: 15,
            TimeFrame.M30: 30,
            TimeFrame.H1: 60,
            TimeFrame.H4: 240,
            TimeFrame.D1: 1440
        }
        return timeframe_map.get(timeframe, 5)
