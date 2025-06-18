"""
Order Flow API endpoints for WADM.

Provides REST API access to order flow analysis including:
- Real-time order flow monitoring
- Historical order flow analysis
- Delta tracking and momentum
- Absorption and imbalance detection
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from ...core.entities import Symbol, Exchange, TimeFrame
from ...application.use_cases.order_flow import (
    CalculateOrderFlowUseCase,
    CalculateOrderFlowRequest,
    GetRealTimeOrderFlowUseCase,
    GetRealTimeOrderFlowRequest,
    GetOrderFlowSeriesUseCase,
    GetOrderFlowSeriesRequest,
    DetectAbsorptionEventsUseCase,
    DetectAbsorptionEventsRequest,
    DetectImbalanceEventsUseCase,
    DetectImbalanceEventsRequest,
)
from ...infrastructure.database.repositories import get_trade_repository, get_orderbook_repository
from ...infrastructure.cache.redis_cache import get_redis_cache

router = APIRouter(prefix="/order-flow", tags=["Order Flow"])


# Response Models for API
class OrderFlowLevelResponse(BaseModel):
    """Order flow level data for API response."""
    price: float
    buy_volume: float
    sell_volume: float
    delta: float
    trade_count: int
    buy_trade_count: int
    sell_trade_count: int
    avg_trade_size: float
    max_trade_size: float
    volume_percentage: float


class AbsorptionEventResponse(BaseModel):
    """Absorption event data for API response."""
    price: float
    timestamp: str
    absorbed_volume: float
    absorption_type: str
    strength: float
    duration_ms: int


class ImbalanceEventResponse(BaseModel):
    """Imbalance event data for API response."""
    price_start: float
    price_end: float
    timestamp: str
    direction: str
    buy_volume: float
    sell_volume: float
    imbalance_ratio: float
    strength: float


class OrderFlowProfileResponse(BaseModel):
    """Complete order flow profile for API response."""
    symbol: str
    exchange: str
    start_time: str
    end_time: str
    timeframe: str
    
    # Aggregate metrics
    total_volume: float
    total_buy_volume: float
    total_sell_volume: float
    net_delta: float
    cumulative_delta: float
    
    # Trade statistics
    total_trades: int
    buy_trades: int
    sell_trades: int
    avg_trade_size: float
    
    # Price level analysis
    levels: List[OrderFlowLevelResponse]
    
    # Events
    absorption_events: List[AbsorptionEventResponse]
    imbalance_events: List[ImbalanceEventResponse]
    
    # Metrics
    buy_percentage: float
    sell_percentage: float
    delta_momentum: float
    market_efficiency: float


class OrderFlowAnalysisResponse(BaseModel):
    """Order flow analysis with insights."""
    order_flow: OrderFlowProfileResponse
    analysis: Dict[str, Any]


class RealTimeOrderFlowResponse(BaseModel):
    """Real-time order flow response."""
    order_flow: OrderFlowProfileResponse
    market_condition: str
    signals: List[str]
    timestamp: str


class OrderFlowSeriesResponse(BaseModel):
    """Order flow series response."""
    profiles: List[OrderFlowProfileResponse]
    trends: Dict[str, Any]
    summary: Dict[str, Any]


# API Endpoints
@router.get("/current/{symbol}", response_model=RealTimeOrderFlowResponse)
async def get_current_order_flow(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    use_orderbook: bool = Query(default=True, description="Use orderbook for classification"),
    trade_repo = Depends(get_trade_repository),
    orderbook_repo = Depends(get_orderbook_repository),
    cache = Depends(get_redis_cache)
):
    """
    Get current/real-time order flow analysis.
    
    Returns order flow for the current timeframe period with:
    - Buy/sell classification and delta
    - Absorption and imbalance detection
    - Market condition assessment
    - Trading signals
    """
    try:
        use_case = GetRealTimeOrderFlowUseCase(
            trade_repository=trade_repo,
            orderbook_repository=orderbook_repo if use_orderbook else None,
            cache=cache
        )
        
        request = GetRealTimeOrderFlowRequest(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            use_orderbook=use_orderbook
        )
        
        response = await use_case.execute(request)
        
        return RealTimeOrderFlowResponse(
            order_flow=_convert_order_flow_to_response(response.order_flow),
            market_condition=response.market_condition,
            signals=response.signals,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting current order flow: {str(e)}")


@router.get("/historical/{symbol}", response_model=List[OrderFlowProfileResponse])
async def get_historical_order_flow_series(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    periods: int = Query(default=24, ge=1, le=100, description="Number of periods"),
    trade_repo = Depends(get_trade_repository),
    cache = Depends(get_redis_cache)
):
    """
    Get historical order flow series across multiple periods.
    
    Returns order flow analysis for the specified number of periods,
    useful for trend analysis and pattern recognition.
    """
    try:
        use_case = GetOrderFlowSeriesUseCase(
            trade_repository=trade_repo,
            cache=cache
        )
        
        request = GetOrderFlowSeriesRequest(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            periods=periods
        )
        
        response = await use_case.execute(request)
        
        return [_convert_order_flow_to_response(profile) for profile in response.profiles]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting historical order flow: {str(e)}")


@router.get("/calculate/{symbol}", response_model=OrderFlowAnalysisResponse)
async def calculate_order_flow_for_period(
    symbol: str,
    start_time: str = Query(..., description="Start time (ISO format)"),
    end_time: str = Query(..., description="End time (ISO format)"),
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    use_orderbook: bool = Query(default=False, description="Use orderbook for classification"),
    trade_repo = Depends(get_trade_repository),
    orderbook_repo = Depends(get_orderbook_repository),
    cache = Depends(get_redis_cache)
):
    """
    Calculate order flow analysis for a specific time period.
    
    Allows custom time range analysis with detailed insights including:
    - Comprehensive delta analysis
    - Absorption and imbalance events
    - Market efficiency metrics
    - Trading insights
    """
    try:
        # Parse timestamps
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        use_case = CalculateOrderFlowUseCase(
            trade_repository=trade_repo,
            orderbook_repository=orderbook_repo if use_orderbook else None,
            cache=cache
        )
        
        request = CalculateOrderFlowRequest(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            start_time=start_dt,
            end_time=end_dt,
            timeframe=TimeFrame(timeframe),
            use_orderbook=use_orderbook
        )
        
        response = await use_case.execute(request)
        
        return OrderFlowAnalysisResponse(
            order_flow=_convert_order_flow_to_response(response.order_flow),
            analysis=response.analysis
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating order flow: {str(e)}")


@router.get("/absorption-events/{symbol}", response_model=List[AbsorptionEventResponse])
async def get_absorption_events(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    lookback_periods: int = Query(default=12, ge=1, le=50, description="Periods to analyze"),
    trade_repo = Depends(get_trade_repository),
    cache = Depends(get_redis_cache)
):
    """
    Detect absorption events where large orders are being absorbed.
    
    Returns events where significant volume is being absorbed at specific
    price levels, indicating institutional activity or strong support/resistance.
    """
    try:
        use_case = DetectAbsorptionEventsUseCase(
            trade_repository=trade_repo,
            cache=cache
        )
        
        request = DetectAbsorptionEventsRequest(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            lookback_periods=lookback_periods
        )
        
        response = await use_case.execute(request)
        
        return [
            AbsorptionEventResponse(
                price=float(event.price),
                timestamp=event.timestamp,
                absorbed_volume=float(event.absorbed_volume),
                absorption_type=event.absorption_type.value,
                strength=event.strength,
                duration_ms=event.duration_ms
            )
            for event in response.events
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting absorption events: {str(e)}")


@router.get("/imbalance-events/{symbol}", response_model=List[ImbalanceEventResponse])
async def get_imbalance_events(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    lookback_periods: int = Query(default=12, ge=1, le=50, description="Periods to analyze"),
    trade_repo = Depends(get_trade_repository),
    cache = Depends(get_redis_cache)
):
    """
    Detect order flow imbalance events across price levels.
    
    Returns events where there's a significant imbalance between
    buy and sell orders across consecutive price levels.
    """
    try:
        use_case = DetectImbalanceEventsUseCase(
            trade_repository=trade_repo,
            cache=cache
        )
        
        request = DetectImbalanceEventsRequest(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            lookback_periods=lookback_periods
        )
        
        response = await use_case.execute(request)
        
        return [
            ImbalanceEventResponse(
                price_start=float(event.price_start),
                price_end=float(event.price_end),
                timestamp=event.timestamp,
                direction=event.direction.value,
                buy_volume=float(event.buy_volume),
                sell_volume=float(event.sell_volume),
                imbalance_ratio=event.imbalance_ratio,
                strength=event.strength
            )
            for event in response.events
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting imbalance events: {str(e)}")


@router.get("/delta-analysis/{symbol}")
async def get_delta_momentum_analysis(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    periods: int = Query(default=24, ge=6, le=100, description="Periods to analyze"),
    trade_repo = Depends(get_trade_repository),
    cache = Depends(get_redis_cache)
):
    """
    Get delta momentum analysis across multiple periods.
    
    Analyzes delta trends, momentum, and provides trading insights
    based on cumulative order flow patterns.
    """
    try:
        from ...application.services.order_flow_service import OrderFlowService
        
        service = OrderFlowService(
            trade_repository=trade_repo,
            cache=cache
        )
        
        analysis = await service.get_delta_momentum_analysis(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            periods=periods
        )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting delta analysis: {str(e)}")


@router.get("/market-efficiency/{symbol}")
async def get_market_efficiency_analysis(
    symbol: str,
    exchange: str = Query(default="bybit", description="Exchange name"),
    timeframe: str = Query(default="5m", description="Analysis timeframe"),
    periods: int = Query(default=12, ge=3, le=50, description="Periods to analyze"),
    trade_repo = Depends(get_trade_repository),
    cache = Depends(get_redis_cache)
):
    """
    Get market efficiency analysis based on buy/sell balance.
    
    Analyzes how balanced the market is and provides insights
    into market condition and efficiency.
    """
    try:
        from ...application.services.order_flow_service import OrderFlowService
        
        service = OrderFlowService(
            trade_repository=trade_repo,
            cache=cache
        )
        
        efficiency = await service.get_market_efficiency_score(
            symbol=Symbol(symbol),
            exchange=Exchange(exchange),
            timeframe=TimeFrame(timeframe),
            periods=periods
        )
        
        return efficiency
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting efficiency analysis: {str(e)}")


# Helper function to convert domain model to response model
def _convert_order_flow_to_response(order_flow) -> OrderFlowProfileResponse:
    """Convert OrderFlowProfile domain model to API response model."""
    return OrderFlowProfileResponse(
        symbol=order_flow.symbol,
        exchange=order_flow.exchange,
        start_time=order_flow.start_time,
        end_time=order_flow.end_time,
        timeframe=order_flow.timeframe,
        total_volume=float(order_flow.total_volume),
        total_buy_volume=float(order_flow.total_buy_volume),
        total_sell_volume=float(order_flow.total_sell_volume),
        net_delta=float(order_flow.net_delta),
        cumulative_delta=float(order_flow.cumulative_delta),
        total_trades=order_flow.total_trades,
        buy_trades=order_flow.buy_trades,
        sell_trades=order_flow.sell_trades,
        avg_trade_size=float(order_flow.avg_trade_size),
        levels=[
            OrderFlowLevelResponse(
                price=float(level.price),
                buy_volume=float(level.buy_volume),
                sell_volume=float(level.sell_volume),
                delta=float(level.delta),
                trade_count=level.trade_count,
                buy_trade_count=level.buy_trade_count,
                sell_trade_count=level.sell_trade_count,
                avg_trade_size=float(level.avg_trade_size),
                max_trade_size=float(level.max_trade_size),
                volume_percentage=float(level.volume_percentage)
            )
            for level in order_flow.levels
        ],
        absorption_events=[
            AbsorptionEventResponse(
                price=float(event.price),
                timestamp=event.timestamp,
                absorbed_volume=float(event.absorbed_volume),
                absorption_type=event.absorption_type.value,
                strength=event.strength,
                duration_ms=event.duration_ms
            )
            for event in order_flow.absorption_events
        ],
        imbalance_events=[
            ImbalanceEventResponse(
                price_start=float(event.price_start),
                price_end=float(event.price_end),
                timestamp=event.timestamp,
                direction=event.direction.value,
                buy_volume=float(event.buy_volume),
                sell_volume=float(event.sell_volume),
                imbalance_ratio=event.imbalance_ratio,
                strength=event.strength
            )
            for event in order_flow.imbalance_events
        ],
        buy_percentage=order_flow.buy_percentage,
        sell_percentage=order_flow.sell_percentage,
        delta_momentum=order_flow.delta_momentum,
        market_efficiency=order_flow.market_efficiency
    )
