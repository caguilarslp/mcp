"""
Core domain entities for WADM.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum

from .types import Symbol, Exchange, Side, OrderType

# Define TradeType enum for backward compatibility
class TradeType(str, Enum):
    BUY = "buy"
    SELL = "sell"


class Trade(BaseModel):
    """Individual trade data."""
    
    id: str = Field(..., description="Trade ID from exchange")
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    price: Decimal = Field(..., description="Trade price")
    quantity: Decimal = Field(..., description="Trade quantity")
    side: Side = Field(..., description="Trade side (buy/sell)")
    timestamp: datetime = Field(..., description="Trade timestamp")
    is_buyer_maker: bool = Field(..., description="Whether buyer was the maker")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }
    
    @validator('timestamp', pre=True, allow_reuse=True)
    def parse_timestamp(cls, v):
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc)
        elif isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v
    
    @property
    def volume(self) -> Decimal:
        """Calculate volume as price * quantity."""
        return self.price * self.quantity
    
    @property 
    def trade_id(self) -> str:
        """Alias for id (for Order Flow compatibility)."""
        return self.id
    
    @property
    def trade_type(self) -> TradeType:
        """Convert side to TradeType for compatibility."""
        return TradeType.BUY if self.side == Side.BUY else TradeType.SELL


class OrderBookLevel(BaseModel):
    """Single level in order book."""
    
    price: Decimal = Field(..., description="Price level")
    quantity: Decimal = Field(..., description="Total quantity at price")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
        }


class OrderBook(BaseModel):
    """Order book snapshot."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    timestamp: datetime = Field(..., description="Snapshot timestamp")
    bids: List[OrderBookLevel] = Field(..., description="Bid levels (highest first)")
    asks: List[OrderBookLevel] = Field(..., description="Ask levels (lowest first)")
    sequence: Optional[int] = Field(None, description="Sequence number for ordering")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }
    
    @validator('timestamp', pre=True, allow_reuse=True)
    def parse_timestamp(cls, v):
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc)
        elif isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v
    
    @property
    def best_bid(self) -> Optional[OrderBookLevel]:
        """Get best bid price."""
        return self.bids[0] if self.bids else None
    
    @property
    def best_ask(self) -> Optional[OrderBookLevel]:
        """Get best ask price."""
        return self.asks[0] if self.asks else None
    
    @property
    def spread(self) -> Optional[Decimal]:
        """Get bid-ask spread."""
        if self.best_bid and self.best_ask:
            return self.best_ask.price - self.best_bid.price
        return None
    
    @property
    def mid_price(self) -> Optional[Decimal]:
        """Get mid price."""
        if self.best_bid and self.best_ask:
            return (self.best_bid.price + self.best_ask.price) / 2
        return None


class Kline(BaseModel):
    """Candlestick/Kline data."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    interval: str = Field(..., description="Kline interval (1m, 5m, 1h, etc)")
    open_time: datetime = Field(..., description="Kline open time")
    close_time: datetime = Field(..., description="Kline close time")
    open_price: Decimal = Field(..., description="Open price")
    high_price: Decimal = Field(..., description="High price")
    low_price: Decimal = Field(..., description="Low price")
    close_price: Decimal = Field(..., description="Close price")
    volume: Decimal = Field(..., description="Volume")
    quote_volume: Decimal = Field(..., description="Quote asset volume")
    trades_count: int = Field(..., description="Number of trades")
    taker_buy_volume: Decimal = Field(..., description="Taker buy base asset volume")
    taker_buy_quote_volume: Decimal = Field(..., description="Taker buy quote asset volume")
    is_closed: bool = Field(True, description="Whether this kline is closed")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }
    
    @validator('open_time', 'close_time', pre=True, allow_reuse=True)
    def parse_timestamp(cls, v):
        if isinstance(v, (int, float)):
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc)
        elif isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v


class VolumeNode(BaseModel):
    """Volume node in a volume profile."""
    
    price_level: Decimal = Field(..., description="Price level")
    volume: Decimal = Field(..., description="Total volume at this level")
    buy_volume: Decimal = Field(..., description="Buy volume at this level")
    sell_volume: Decimal = Field(..., description="Sell volume at this level")
    trade_count: int = Field(..., description="Number of trades at this level")
    
    @property
    def delta(self) -> Decimal:
        """Volume delta (buy - sell)."""
        return self.buy_volume - self.sell_volume
    
    @validator('volume')
    def validate_volume_sum(cls, v, values):
        if 'buy_volume' in values and 'sell_volume' in values:
            expected = values['buy_volume'] + values['sell_volume']
            if v != expected:
                raise ValueError(f"Total volume must equal sum of buy and sell volumes")
        return v


class VolumeProfile(BaseModel):
    """Volume Profile data for a given period."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    start_time: datetime = Field(..., description="Period start time")
    end_time: datetime = Field(..., description="Period end time")
    price_levels: Dict[str, Decimal] = Field(..., description="Price -> Volume mapping")
    poc_price: Decimal = Field(..., description="Point of Control (highest volume price)")
    vah_price: Decimal = Field(..., description="Value Area High")
    val_price: Decimal = Field(..., description="Value Area Low")
    total_volume: Decimal = Field(..., description="Total volume in period")
    value_area_volume: Decimal = Field(..., description="Volume in value area (70%)")
    nodes: List[VolumeNode] = Field(default_factory=list, description="Volume nodes")
    
    @property
    def poc(self) -> Optional[Decimal]:
        """Point of Control - price level with highest volume."""
        return self.poc_price
    
    @property
    def vah(self) -> Optional[Decimal]:
        """Value Area High."""
        return self.vah_price
    
    @property
    def val(self) -> Optional[Decimal]:
        """Value Area Low."""
        return self.val_price
    
    @property
    def timeframe(self) -> str:
        """Timeframe alias for compatibility."""
        # Calculate from time range
        duration = self.end_time - self.start_time
        hours = duration.total_seconds() / 3600
        if hours == 1:
            return "1h"
        elif hours == 4:
            return "4h"
        elif hours == 24:
            return "1d"
        else:
            return f"{int(hours)}h"
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class OrderFlow(BaseModel):
    """Order Flow analysis data."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    timeframe: str = Field(..., description="Analysis timeframe")
    delta: Decimal = Field(..., description="Buy volume - Sell volume")
    cumulative_delta: Decimal = Field(..., description="Cumulative delta")
    buy_volume: Decimal = Field(..., description="Total buy volume")
    sell_volume: Decimal = Field(..., description="Total sell volume")
    total_volume: Decimal = Field(..., description="Total volume")
    imbalance_ratio: Decimal = Field(..., description="Buy/Sell imbalance ratio")
    large_trades_count: int = Field(..., description="Number of large trades")
    absorption_events: int = Field(..., description="Number of absorption events detected")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class LiquidityLevel(BaseModel):
    """Identified liquidity level."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    price: Decimal = Field(..., description="Price level")
    liquidity_type: str = Field(..., description="Type: support, resistance, POC, etc")
    strength: Decimal = Field(..., description="Strength score (0-100)")
    volume: Decimal = Field(..., description="Volume at this level")
    touches: int = Field(..., description="Number of times price touched this level")
    last_touch: datetime = Field(..., description="Last time price was at this level")
    created_at: datetime = Field(..., description="When this level was identified")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat(),
        }


class MarketStructure(BaseModel):
    """Market structure analysis."""
    
    symbol: Symbol = Field(..., description="Trading pair symbol")
    exchange: Exchange = Field(..., description="Exchange name")
    timestamp: datetime = Field(..., description="Analysis timestamp")
    timeframe: str = Field(..., description="Analysis timeframe")
    trend: str = Field(..., description="Current trend: bullish, bearish, sideways")
    structure_breaks: List[Dict[str, Any]] = Field(..., description="Recent structure breaks")
    liquidity_levels: List[LiquidityLevel] = Field(..., description="Key liquidity levels")
    volume_profile: Optional[VolumeProfile] = Field(None, description="Current volume profile")
    order_flow: Optional[OrderFlow] = Field(None, description="Current order flow")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


# Aliases for backward compatibility with Order Flow code
TradeData = Trade
OrderBookData = OrderBook
KlineData = Kline

# Import and re-export types needed by other modules
from .types import Symbol, Exchange, Side, OrderType, TimeFrame

__all__ = [
    "Trade", "TradeData", "TradeType",
    "OrderBook", "OrderBookData", "OrderBookLevel",
    "Kline", "KlineData",
    "VolumeProfile", "VolumeNode", "OrderFlow", "LiquidityLevel", "MarketStructure",
    "Symbol", "Exchange", "Side", "OrderType", "TimeFrame"
]
