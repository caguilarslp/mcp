"""
Market Data Models
Pydantic models for market data endpoints
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from decimal import Decimal

from pydantic import BaseModel, Field

from src.api.models import TimeFrame, Exchange


class Trade(BaseModel):
    id: str
    symbol: str
    exchange: str
    price: Decimal
    quantity: Decimal
    side: str
    timestamp: datetime
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class Candle(BaseModel):
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    trades: int = Field(0, description="Number of trades in candle")
    buy_volume: Optional[Decimal] = Field(None, description="Volume from buy trades")
    sell_volume: Optional[Decimal] = Field(None, description="Volume from sell trades")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class OrderBookLevel(BaseModel):
    price: Decimal
    quantity: Decimal
    count: int = Field(1, description="Number of orders at this level")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class OrderBook(BaseModel):
    symbol: str
    exchange: str
    timestamp: datetime
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    spread: Optional[Decimal] = None
    mid_price: Optional[Decimal] = None
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class MarketStats(BaseModel):
    symbol: str
    exchange: str
    timeframe: TimeFrame
    start_time: datetime
    end_time: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    trades: int
    vwap: Optional[Decimal] = None
    change: Optional[Decimal] = Field(None, description="Price change")
    change_percent: Optional[Decimal] = Field(None, description="Price change percentage")
    
    def __init__(self, **data):
        super().__init__(**data)
        # Calculate change and change_percent if not provided
        if self.change is None and self.open and self.close:
            self.change = self.close - self.open
        if self.change_percent is None and self.open and self.close and self.open != 0:
            self.change_percent = ((self.close - self.open) / self.open) * 100
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SymbolInfo(BaseModel):
    symbol: str
    exchanges: List[str]
    category: str
    description: Optional[str] = None
    active: bool = True
    base_asset: Optional[str] = Field(None, description="Base asset (e.g., BTC)")
    quote_asset: Optional[str] = Field(None, description="Quote asset (e.g., USDT)")
    
    def __init__(self, **data):
        super().__init__(**data)
        # Auto-extract base and quote if not provided
        if not self.base_asset or not self.quote_asset:
            symbol = self.symbol.upper()
            if symbol.endswith("USDT"):
                self.base_asset = symbol[:-4]
                self.quote_asset = "USDT"
            elif symbol.endswith("USD"):
                self.base_asset = symbol[:-3]
                self.quote_asset = "USD"


class MarketSummary(BaseModel):
    timestamp: datetime
    total_trades: int
    total_volume: Decimal
    active_symbols: int
    exchanges: Dict[str, Dict[str, Any]]
    system_status: str = Field("healthy", description="Overall system status")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class MultiSymbolStats(BaseModel):
    """Response model for multi-symbol statistics"""
    timestamp: datetime
    symbols: Dict[str, Optional[MarketStats]]
    total_symbols: int
    symbols_with_data: int
    
    def __init__(self, **data):
        super().__init__(**data)
        if not hasattr(self, 'symbols_with_data'):
            self.symbols_with_data = sum(1 for v in self.symbols.values() if v is not None)


class TradeStreamMessage(BaseModel):
    """WebSocket message for trade streaming"""
    type: str = Field(..., description="Message type: 'trade', 'status', 'error', 'pong'")
    data: Optional[Dict[str, Any]] = Field(None, description="Message data")
    message: Optional[str] = Field(None, description="Status or error message")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")


class CandleRequest(BaseModel):
    """Request model for candle data with advanced parameters"""
    symbol: str
    timeframe: TimeFrame
    exchange: Optional[Exchange] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(500, ge=1, le=1000)
    include_volume_split: bool = Field(False, description="Include buy/sell volume split")
    
    
class AggregatedCandle(Candle):
    """Enhanced candle with aggregated data from multiple exchanges"""
    exchanges: List[str] = Field(default_factory=list, description="Contributing exchanges")
    volume_by_exchange: Optional[Dict[str, Decimal]] = Field(None, description="Volume breakdown by exchange")
    dominant_exchange: Optional[str] = Field(None, description="Exchange with highest volume")
    
    
class LiquidityMetrics(BaseModel):
    """Liquidity metrics for market analysis"""
    symbol: str
    timestamp: datetime
    bid_liquidity: Decimal = Field(..., description="Total bid liquidity")
    ask_liquidity: Decimal = Field(..., description="Total ask liquidity")
    spread_bps: Decimal = Field(..., description="Spread in basis points")
    market_impact_1pct: Decimal = Field(..., description="Price impact for 1% of volume")
    effective_spread: Decimal = Field(..., description="Effective spread")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class MarketDepth(BaseModel):
    """Market depth analysis"""
    symbol: str
    exchange: str
    timestamp: datetime
    depth_levels: List[Dict[str, Any]]
    total_bid_volume: Decimal
    total_ask_volume: Decimal
    imbalance_ratio: Decimal = Field(..., description="Bid/Ask volume ratio")
    liquidity_score: int = Field(..., ge=0, le=100, description="Liquidity quality score")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }
