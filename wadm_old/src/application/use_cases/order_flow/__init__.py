"""
Order Flow use cases for application layer.

This module provides use cases for order flow analysis including:
- Real-time order flow calculations
- Historical order flow analysis
- Absorption and imbalance detection
- Delta momentum analysis
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime

from src.core.entities import Symbol, Exchange, TimeFrame
from src.core.algorithms.order_flow_calculator import OrderFlowProfile
from src.application.services.order_flow_service import OrderFlowService
from src.infrastructure.database.repositories import TradeRepository, OrderBookRepository
from src.infrastructure.cache.redis_cache import RedisCache


@dataclass
class CalculateOrderFlowRequest:
    """Request for calculating order flow."""
    symbol: Symbol
    exchange: Exchange
    start_time: datetime
    end_time: datetime
    timeframe: TimeFrame
    use_orderbook: bool = False


@dataclass
class CalculateOrderFlowResponse:
    """Response from order flow calculation."""
    order_flow: OrderFlowProfile
    analysis: Dict[str, Any]


class CalculateOrderFlowUseCase:
    """Use case for calculating order flow for a specific period."""
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        orderbook_repository: Optional[OrderBookRepository] = None,
        cache: Optional[RedisCache] = None
    ):
        self.service = OrderFlowService(
            trade_repository=trade_repository,
            orderbook_repository=orderbook_repository,
            cache=cache
        )
    
    async def execute(self, request: CalculateOrderFlowRequest) -> CalculateOrderFlowResponse:
        """Execute the use case."""
        # Get order flow
        order_flow = await self.service.get_historical_order_flow(
            symbol=request.symbol,
            exchange=request.exchange,
            start_time=request.start_time,
            end_time=request.end_time,
            timeframe=request.timeframe,
            use_orderbook=request.use_orderbook
        )
        
        # Prepare analysis
        analysis = {
            "trend": "bullish" if order_flow.net_delta > 0 else "bearish",
            "strength": abs(order_flow.delta_momentum),
            "efficiency": order_flow.market_efficiency,
            "key_levels": [
                {"price": float(level.price), "delta": float(level.delta)}
                for level in sorted(order_flow.levels, key=lambda x: abs(x.delta), reverse=True)[:5]
            ],
            "insights": self._generate_insights(order_flow)
        }
        
        return CalculateOrderFlowResponse(
            order_flow=order_flow,
            analysis=analysis
        )
    
    def _generate_insights(self, order_flow: OrderFlowProfile) -> List[str]:
        """Generate trading insights from order flow."""
        insights = []
        
        # Delta insights
        if order_flow.net_delta > order_flow.total_volume * 0.1:
            insights.append(f"Strong buying pressure detected (delta: {order_flow.net_delta:.0f})")
        elif order_flow.net_delta < -order_flow.total_volume * 0.1:
            insights.append(f"Strong selling pressure detected (delta: {order_flow.net_delta:.0f})")
        
        # Efficiency insights
        if order_flow.market_efficiency < 40:
            insights.append("Market showing high imbalance - potential directional move")
        elif order_flow.market_efficiency > 80:
            insights.append("Market highly balanced - possible range-bound conditions")
        
        # Event insights
        if order_flow.absorption_events:
            insights.append(f"{len(order_flow.absorption_events)} absorption events detected")
        if order_flow.imbalance_events:
            insights.append(f"{len(order_flow.imbalance_events)} imbalance zones identified")
        
        return insights


@dataclass
class GetRealTimeOrderFlowRequest:
    """Request for getting real-time order flow."""
    symbol: Symbol
    exchange: Exchange
    timeframe: TimeFrame
    use_orderbook: bool = True


@dataclass
class GetRealTimeOrderFlowResponse:
    """Response from real-time order flow."""
    order_flow: OrderFlowProfile
    market_condition: str
    signals: List[str]


class GetRealTimeOrderFlowUseCase:
    """Use case for getting real-time order flow."""
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        orderbook_repository: Optional[OrderBookRepository] = None,
        cache: Optional[RedisCache] = None
    ):
        self.service = OrderFlowService(
            trade_repository=trade_repository,
            orderbook_repository=orderbook_repository,
            cache=cache
        )
    
    async def execute(self, request: GetRealTimeOrderFlowRequest) -> GetRealTimeOrderFlowResponse:
        """Execute the use case."""
        # Get real-time order flow
        order_flow = await self.service.get_real_time_order_flow(
            symbol=request.symbol,
            exchange=request.exchange,
            timeframe=request.timeframe,
            use_orderbook=request.use_orderbook
        )
        
        # Determine market condition
        market_condition = self._determine_market_condition(order_flow)
        
        # Generate signals
        signals = self._generate_signals(order_flow)
        
        return GetRealTimeOrderFlowResponse(
            order_flow=order_flow,
            market_condition=market_condition,
            signals=signals
        )
    
    def _determine_market_condition(self, order_flow: OrderFlowProfile) -> str:
        """Determine current market condition from order flow."""
        if order_flow.market_efficiency > 80:
            return "balanced"
        elif order_flow.net_delta > order_flow.total_volume * 0.2:
            return "strong_buying"
        elif order_flow.net_delta < -order_flow.total_volume * 0.2:
            return "strong_selling"
        elif order_flow.absorption_events:
            return "absorption_detected"
        else:
            return "neutral"
    
    def _generate_signals(self, order_flow: OrderFlowProfile) -> List[str]:
        """Generate trading signals from order flow."""
        signals = []
        
        # Delta signals
        if order_flow.delta_momentum > 70:
            signals.append("BULLISH: Strong positive delta momentum")
        elif order_flow.delta_momentum < -70:
            signals.append("BEARISH: Strong negative delta momentum")
        
        # Absorption signals
        for event in order_flow.absorption_events:
            if event.strength > 80:
                signals.append(f"ABSORPTION: Strong {event.absorption_type} at {event.price}")
        
        # Imbalance signals
        for event in order_flow.imbalance_events:
            if event.strength > 75:
                signals.append(f"IMBALANCE: {event.direction} zone {event.price_start}-{event.price_end}")
        
        return signals[:5]  # Return top 5 signals


@dataclass
class GetOrderFlowSeriesRequest:
    """Request for getting order flow series."""
    symbol: Symbol
    exchange: Exchange
    timeframe: TimeFrame
    periods: int


@dataclass
class GetOrderFlowSeriesResponse:
    """Response from order flow series."""
    profiles: List[OrderFlowProfile]
    trends: Dict[str, Any]
    summary: Dict[str, Any]


class GetOrderFlowSeriesUseCase:
    """Use case for getting historical order flow series."""
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        cache: Optional[RedisCache] = None
    ):
        self.service = OrderFlowService(
            trade_repository=trade_repository,
            cache=cache
        )
    
    async def execute(self, request: GetOrderFlowSeriesRequest) -> GetOrderFlowSeriesResponse:
        """Execute the use case."""
        # Get order flow series
        profiles = await self.service.get_order_flow_series(
            symbol=request.symbol,
            exchange=request.exchange,
            timeframe=request.timeframe,
            periods=request.periods
        )
        
        # Analyze trends
        trends = self._analyze_trends(profiles)
        
        # Create summary
        summary = self._create_summary(profiles)
        
        return GetOrderFlowSeriesResponse(
            profiles=profiles,
            trends=trends,
            summary=summary
        )
    
    def _analyze_trends(self, profiles: List[OrderFlowProfile]) -> Dict[str, Any]:
        """Analyze trends in order flow series."""
        if not profiles:
            return {}
        
        # Delta trend
        deltas = [float(p.net_delta) for p in profiles]
        delta_trend = "increasing" if deltas[-1] > deltas[0] else "decreasing"
        
        # Volume trend
        volumes = [float(p.total_volume) for p in profiles]
        volume_trend = "increasing" if volumes[-1] > volumes[0] else "decreasing"
        
        # Efficiency trend
        efficiencies = [p.market_efficiency for p in profiles]
        efficiency_trend = "improving" if efficiencies[-1] > efficiencies[0] else "deteriorating"
        
        return {
            "delta_trend": delta_trend,
            "volume_trend": volume_trend,
            "efficiency_trend": efficiency_trend,
            "delta_change": deltas[-1] - deltas[0] if deltas else 0,
            "volume_change": volumes[-1] - volumes[0] if volumes else 0
        }
    
    def _create_summary(self, profiles: List[OrderFlowProfile]) -> Dict[str, Any]:
        """Create summary of order flow series."""
        if not profiles:
            return {}
        
        total_volume = sum(float(p.total_volume) for p in profiles)
        total_buy_volume = sum(float(p.total_buy_volume) for p in profiles)
        total_sell_volume = sum(float(p.total_sell_volume) for p in profiles)
        
        return {
            "periods_analyzed": len(profiles),
            "total_volume": total_volume,
            "total_buy_volume": total_buy_volume,
            "total_sell_volume": total_sell_volume,
            "average_efficiency": sum(p.market_efficiency for p in profiles) / len(profiles),
            "total_absorption_events": sum(len(p.absorption_events) for p in profiles),
            "total_imbalance_events": sum(len(p.imbalance_events) for p in profiles)
        }


@dataclass
class DetectAbsorptionEventsRequest:
    """Request for detecting absorption events."""
    symbol: Symbol
    exchange: Exchange
    timeframe: TimeFrame
    lookback_periods: int


@dataclass
class DetectAbsorptionEventsResponse:
    """Response from absorption detection."""
    events: List[Any]  # AbsorptionEvent from calculator
    summary: Dict[str, Any]


class DetectAbsorptionEventsUseCase:
    """Use case for detecting absorption events."""
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        cache: Optional[RedisCache] = None
    ):
        self.service = OrderFlowService(
            trade_repository=trade_repository,
            cache=cache
        )
    
    async def execute(self, request: DetectAbsorptionEventsRequest) -> DetectAbsorptionEventsResponse:
        """Execute the use case."""
        # Detect absorption events
        events = await self.service.detect_absorption_events(
            symbol=request.symbol,
            exchange=request.exchange,
            timeframe=request.timeframe,
            lookback_periods=request.lookback_periods
        )
        
        # Create summary
        summary = {
            "total_events": len(events),
            "buy_absorption": len([e for e in events if e.absorption_type == "buy"]),
            "sell_absorption": len([e for e in events if e.absorption_type == "sell"]),
            "average_strength": sum(e.strength for e in events) / len(events) if events else 0,
            "high_strength_events": len([e for e in events if e.strength > 80])
        }
        
        return DetectAbsorptionEventsResponse(
            events=events,
            summary=summary
        )


@dataclass
class DetectImbalanceEventsRequest:
    """Request for detecting imbalance events."""
    symbol: Symbol
    exchange: Exchange
    timeframe: TimeFrame
    lookback_periods: int


@dataclass
class DetectImbalanceEventsResponse:
    """Response from imbalance detection."""
    events: List[Any]  # ImbalanceEvent from calculator
    summary: Dict[str, Any]


class DetectImbalanceEventsUseCase:
    """Use case for detecting imbalance events."""
    
    def __init__(
        self,
        trade_repository: TradeRepository,
        cache: Optional[RedisCache] = None
    ):
        self.service = OrderFlowService(
            trade_repository=trade_repository,
            cache=cache
        )
    
    async def execute(self, request: DetectImbalanceEventsRequest) -> DetectImbalanceEventsResponse:
        """Execute the use case."""
        # Detect imbalance events
        events = await self.service.detect_imbalance_events(
            symbol=request.symbol,
            exchange=request.exchange,
            timeframe=request.timeframe,
            lookback_periods=request.lookback_periods
        )
        
        # Create summary
        summary = {
            "total_events": len(events),
            "bullish_imbalances": len([e for e in events if e.direction == "bullish"]),
            "bearish_imbalances": len([e for e in events if e.direction == "bearish"]),
            "average_ratio": sum(e.imbalance_ratio for e in events) / len(events) if events else 0,
            "strong_imbalances": len([e for e in events if e.imbalance_ratio > 3])
        }
        
        return DetectImbalanceEventsResponse(
            events=events,
            summary=summary
        )


# Export all use cases
__all__ = [
    "CalculateOrderFlowUseCase",
    "CalculateOrderFlowRequest",
    "CalculateOrderFlowResponse",
    "GetRealTimeOrderFlowUseCase",
    "GetRealTimeOrderFlowRequest",
    "GetRealTimeOrderFlowResponse",
    "GetOrderFlowSeriesUseCase",
    "GetOrderFlowSeriesRequest",
    "GetOrderFlowSeriesResponse",
    "DetectAbsorptionEventsUseCase",
    "DetectAbsorptionEventsRequest",
    "DetectAbsorptionEventsResponse",
    "DetectImbalanceEventsUseCase",
    "DetectImbalanceEventsRequest",
    "DetectImbalanceEventsResponse",
]
