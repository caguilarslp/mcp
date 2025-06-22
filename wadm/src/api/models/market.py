"""
Market Data Models
Pydantic models for market data endpoints
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
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
    
    
class MarketSummary(BaseModel):
    timestamp: datetime
    total_trades: int
    total_volume: Decimal
    active_symbols: int
    exchanges: Dict[str, Dict[str, Any]]
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }
