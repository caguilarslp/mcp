"""
Pydantic v2 models for API requests and responses in WADM.

This module contains optimized Pydantic models for API serialization,
validation, and documentation. These models are separate from domain
entities to allow for API-specific optimizations.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict, field_validator, computed_field
from pydantic.types import PositiveInt, PositiveFloat

from ...core.types import Symbol, Exchange, Side, TimeFrame, TrendDirection, LiquidityType


class APIResponse(BaseModel):
    """Base API response model."""
    model_config = ConfigDict(
        json_encoders={
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat()
        },
        str_strip_whitespace=True,
        validate_assignment=True
    )


class ErrorResponse(APIResponse):
    """Standard error response."""
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code for programmatic handling")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class HealthResponse(APIResponse):
    """Health check response."""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    version: str = Field(..., description="Service version")
    database: Dict[str, Any] = Field(..., description="Database status")
    collectors: Dict[str, Any] = Field(..., description="Collectors status")


# Request Models
class TimeRangeRequest(BaseModel):
    """Base request model for time range queries."""
    start_time: Optional[datetime] = Field(None, description="Start time (UTC)")
    end_time: Optional[datetime] = Field(None, description="End time (UTC)")
    limit: PositiveInt = Field(100, description="Maximum number of results", le=10000)
    
    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, v, info):
        if v and info.data.get('start_time') and v <= info.data['start_time']:
            raise ValueError('end_time must be after start_time')
        return v


class TradeRequest(TimeRangeRequest):
    """Request model for trade queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    min_price: Optional[PositiveFloat] = Field(None, description="Minimum trade price")
    max_price: Optional[PositiveFloat] = Field(None, description="Maximum trade price")
    min_quantity: Optional[PositiveFloat] = Field(None, description="Minimum trade quantity")
    side: Optional[Side] = Field(None, description="Trade side filter")
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


class OrderBookRequest(BaseModel):
    """Request model for orderbook queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    depth: PositiveInt = Field(20, description="Number of price levels", le=100)
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


class KlineRequest(TimeRangeRequest):
    """Request model for kline/candlestick queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    interval: str = Field(..., description="Kline interval", example="1h")
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


class VolumeProfileRequest(TimeRangeRequest):
    """Request model for volume profile queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    timeframe: str = Field("1h", description="Volume profile timeframe", example="1h")
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


class OrderFlowRequest(TimeRangeRequest):
    """Request model for order flow queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    timeframe: str = Field("5m", description="Order flow timeframe", example="5m")
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


class LiquidityLevelRequest(BaseModel):
    """Request model for liquidity level queries."""
    symbol: str = Field(..., description="Trading pair symbol", example="BTCUSDT")
    exchange: Optional[str] = Field(None, description="Exchange name", example="binance")
    min_price: Optional[PositiveFloat] = Field(None, description="Minimum price level")
    max_price: Optional[PositiveFloat] = Field(None, description="Maximum price level")
    min_strength: PositiveFloat = Field(50.0, description="Minimum strength score", le=100.0)
    liquidity_type: Optional[LiquidityType] = Field(None, description="Liquidity level type")
    limit: PositiveInt = Field(50, description="Maximum number of results", le=500)
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        return v.upper()


# Response Models
class TradeResponse(APIResponse):
    """Trade data response model."""
    id: str = Field(..., description="Trade ID")
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    price: float = Field(..., description="Trade price")
    quantity: float = Field(..., description="Trade quantity")
    side: Side = Field(..., description="Trade side")
    timestamp: datetime = Field(..., description="Trade timestamp")
    is_buyer_maker: bool = Field(..., description="Whether buyer was maker")
    
    @computed_field
    @property
    def notional_value(self) -> float:
        """Computed notional value of the trade."""
        return self.price * self.quantity


class OrderBookLevelResponse(APIResponse):
    """Single orderbook level response."""
    price: float = Field(..., description="Price level")
    quantity: float = Field(..., description="Quantity at price level")


class OrderBookResponse(APIResponse):
    """Orderbook response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    timestamp: datetime = Field(..., description="Snapshot timestamp")
    bids: List[OrderBookLevelResponse] = Field(..., description="Bid levels")
    asks: List[OrderBookLevelResponse] = Field(..., description="Ask levels")
    sequence: Optional[int] = Field(None, description="Sequence number")
    
    @computed_field
    @property
    def best_bid(self) -> Optional[float]:
        """Best bid price."""
        return self.bids[0].price if self.bids else None
    
    @computed_field
    @property
    def best_ask(self) -> Optional[float]:
        """Best ask price."""
        return self.asks[0].price if self.asks else None
    
    @computed_field
    @property
    def spread(self) -> Optional[float]:
        """Bid-ask spread."""
        if self.best_bid and self.best_ask:
            return self.best_ask - self.best_bid
        return None
    
    @computed_field
    @property
    def mid_price(self) -> Optional[float]:
        """Mid price."""
        if self.best_bid and self.best_ask:
            return (self.best_bid + self.best_ask) / 2
        return None


class KlineResponse(APIResponse):
    """Kline/candlestick response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    interval: str = Field(..., description="Kline interval")
    open_time: datetime = Field(..., description="Open time")
    close_time: datetime = Field(..., description="Close time")
    open_price: float = Field(..., description="Open price")
    high_price: float = Field(..., description="High price")
    low_price: float = Field(..., description="Low price")
    close_price: float = Field(..., description="Close price")
    volume: float = Field(..., description="Volume")
    quote_volume: float = Field(..., description="Quote volume")
    trades_count: int = Field(..., description="Number of trades")
    taker_buy_volume: float = Field(..., description="Taker buy volume")
    taker_buy_quote_volume: float = Field(..., description="Taker buy quote volume")
    is_closed: bool = Field(..., description="Whether kline is closed")


class VolumeProfileResponse(APIResponse):
    """Volume profile response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    timeframe: str = Field(..., description="Timeframe")
    start_time: datetime = Field(..., description="Period start time")
    end_time: datetime = Field(..., description="Period end time")
    poc_price: float = Field(..., description="Point of Control price")
    vah_price: float = Field(..., description="Value Area High price")
    val_price: float = Field(..., description="Value Area Low price")
    total_volume: float = Field(..., description="Total volume")
    value_area_volume: float = Field(..., description="Value area volume")
    price_levels: Dict[str, float] = Field(..., description="Price level volume distribution")
    
    @computed_field
    @property
    def value_area_percentage(self) -> float:
        """Value area as percentage of total volume."""
        if self.total_volume > 0:
            return (self.value_area_volume / self.total_volume) * 100
        return 0.0
    
    @computed_field
    @property
    def poc_volume_percentage(self) -> float:
        """POC volume as percentage of total volume."""
        poc_volume = self.price_levels.get(str(self.poc_price), 0)
        if self.total_volume > 0:
            return (poc_volume / self.total_volume) * 100
        return 0.0


class OrderFlowResponse(APIResponse):
    """Order flow response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    timeframe: str = Field(..., description="Analysis timeframe")
    delta: float = Field(..., description="Buy volume - Sell volume")
    cumulative_delta: float = Field(..., description="Cumulative delta")
    buy_volume: float = Field(..., description="Buy volume")
    sell_volume: float = Field(..., description="Sell volume")
    total_volume: float = Field(..., description="Total volume")
    imbalance_ratio: float = Field(..., description="Buy/Sell imbalance ratio")
    large_trades_count: int = Field(..., description="Number of large trades")
    absorption_events: int = Field(..., description="Absorption events detected")
    
    @computed_field
    @property
    def buy_percentage(self) -> float:
        """Buy volume as percentage of total."""
        if self.total_volume > 0:
            return (self.buy_volume / self.total_volume) * 100
        return 0.0
    
    @computed_field
    @property
    def sell_percentage(self) -> float:
        """Sell volume as percentage of total."""
        if self.total_volume > 0:
            return (self.sell_volume / self.total_volume) * 100
        return 0.0
    
    @computed_field
    @property
    def delta_percentage(self) -> float:
        """Delta as percentage of total volume."""
        if self.total_volume > 0:
            return (self.delta / self.total_volume) * 100
        return 0.0


class LiquidityLevelResponse(APIResponse):
    """Liquidity level response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    exchange: str = Field(..., description="Exchange name")
    price: float = Field(..., description="Price level")
    liquidity_type: LiquidityType = Field(..., description="Type of liquidity level")
    strength: float = Field(..., description="Strength score (0-100)")
    volume: float = Field(..., description="Volume at this level")
    touches: int = Field(..., description="Number of touches")
    last_touch: datetime = Field(..., description="Last touch timestamp")
    created_at: datetime = Field(..., description="Level creation timestamp")


# Additional response models for complex queries and statistics
class VolumeAnalysisResponse(APIResponse):
    """Volume analysis response model."""
    symbol: str = Field(..., description="Trading pair symbol")
    period_hours: int = Field(..., description="Analysis period in hours")
    total_volume: float = Field(..., description="Total volume")
    buy_volume: float = Field(..., description="Buy volume")
    sell_volume: float = Field(..., description="Sell volume")
    buy_trades: int = Field(..., description="Number of buy trades")
    sell_trades: int = Field(..., description="Number of sell trades")
    avg_buy_size: float = Field(..., description="Average buy trade size")
    avg_sell_size: float = Field(..., description="Average sell trade size")
    large_trades_count: int = Field(..., description="Number of large trades")
    
    @computed_field
    @property
    def buy_sell_ratio(self) -> float:
        """Buy to sell volume ratio."""
        if self.sell_volume > 0:
            return self.buy_volume / self.sell_volume
        return float('inf') if self.buy_volume > 0 else 0.0


class CollectorStatsResponse(APIResponse):
    """Collector statistics response."""
    collector_id: str = Field(..., description="Collector identifier")
    exchange: str = Field(..., description="Exchange name")
    status: str = Field(..., description="Collector status")
    symbols: List[str] = Field(..., description="Monitored symbols")
    uptime_seconds: int = Field(..., description="Uptime in seconds")
    messages_received: int = Field(..., description="Total messages received")
    messages_processed: int = Field(..., description="Messages successfully processed")
    errors_count: int = Field(..., description="Error count")
    last_message_time: Optional[datetime] = Field(None, description="Last message timestamp")
    reconnections: int = Field(..., description="Number of reconnections")
    
    @computed_field
    @property
    def success_rate(self) -> float:
        """Message processing success rate."""
        if self.messages_received > 0:
            return (self.messages_processed / self.messages_received) * 100
        return 0.0
