"""
Basic data models for WADM
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum

class Exchange(str, Enum):
    BYBIT = "bybit"
    BINANCE = "binance"

class Side(str, Enum):
    BUY = "buy"
    SELL = "sell"

@dataclass
class Trade:
    """Single trade data"""
    exchange: Exchange
    symbol: str
    price: float
    quantity: float
    side: Side
    timestamp: datetime
    trade_id: str
    
    def __post_init__(self):
        """Ensure timestamp is timezone-aware"""
        if self.timestamp and self.timestamp.tzinfo is None:
            # If naive datetime, assume UTC
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "exchange": self.exchange.value,
            "symbol": self.symbol,
            "price": self.price,
            "quantity": self.quantity,
            "side": self.side.value,
            "timestamp": self.timestamp,
            "trade_id": self.trade_id
        }

@dataclass
class OrderBookLevel:
    """Single orderbook level"""
    price: float
    quantity: float

@dataclass
class OrderBook:
    """Orderbook snapshot"""
    exchange: Exchange
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "exchange": self.exchange.value,
            "symbol": self.symbol,
            "bids": [[b.price, b.quantity] for b in self.bids],
            "asks": [[a.price, a.quantity] for a in self.asks],
            "timestamp": self.timestamp
        }

@dataclass
class VolumeProfile:
    """Volume profile indicator"""
    symbol: str
    exchange: Exchange
    timestamp: datetime
    poc: float  # Point of Control
    vah: float  # Value Area High
    val: float  # Value Area Low
    volume_distribution: Dict[float, float]  # price -> volume
    total_volume: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange.value,
            "timestamp": self.timestamp,
            "poc": self.poc,
            "vah": self.vah,
            "val": self.val,
            "volume_distribution": self.volume_distribution,
            "total_volume": self.total_volume
        }

@dataclass
class OrderFlow:
    """Order flow indicator"""
    symbol: str
    exchange: Exchange
    timestamp: datetime
    buy_volume: float
    sell_volume: float
    delta: float  # buy_volume - sell_volume
    cumulative_delta: float
    imbalance_ratio: float  # buy_volume / sell_volume if sell_volume > 0
    large_trades_count: int
    absorption_detected: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange.value,
            "timestamp": self.timestamp,
            "buy_volume": self.buy_volume,
            "sell_volume": self.sell_volume,
            "delta": self.delta,
            "cumulative_delta": self.cumulative_delta,
            "imbalance_ratio": self.imbalance_ratio,
            "large_trades_count": self.large_trades_count,
            "absorption_detected": self.absorption_detected
        }
