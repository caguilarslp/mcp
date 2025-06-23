"""
Basic data models for WADM with HIGH PRECISION for institutional analysis
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP

# Configure decimal precision for institutional trading
# 6 decimals for prices (supports satoshi-level precision)
# 8 decimals for quantities (supports micro-lots)
PRICE_PRECISION = 6
QUANTITY_PRECISION = 8

def round_price(value: float) -> Decimal:
    """Round price to institutional precision (6 decimals)"""
    return Decimal(str(value)).quantize(
        Decimal(f'0.{"0" * PRICE_PRECISION}'), 
        rounding=ROUND_HALF_UP
    )

def round_quantity(value: float) -> Decimal:
    """Round quantity to institutional precision (8 decimals)"""
    return Decimal(str(value)).quantize(
        Decimal(f'0.{"0" * QUANTITY_PRECISION}'), 
        rounding=ROUND_HALF_UP
    )

class Exchange(str, Enum):
    BYBIT = "bybit"
    BINANCE = "binance"
    COINBASE = "coinbase"
    KRAKEN = "kraken"

class Side(str, Enum):
    BUY = "buy"
    SELL = "sell"

@dataclass
class Trade:
    """Single trade data with institutional precision"""
    exchange: Exchange
    symbol: str
    price: Decimal  # Changed from float
    quantity: Decimal  # Changed from float
    side: Side
    timestamp: datetime
    trade_id: str
    
    def __post_init__(self):
        """Ensure timestamp is timezone-aware and values have proper precision"""
        if self.timestamp and self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        
        # Ensure proper precision
        if not isinstance(self.price, Decimal):
            self.price = round_price(self.price)
        if not isinstance(self.quantity, Decimal):
            self.quantity = round_quantity(self.quantity)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "exchange": self.exchange.value,
            "symbol": self.symbol,
            "price": float(self.price),  # Convert to float for JSON
            "quantity": float(self.quantity),
            "side": self.side.value,
            "timestamp": self.timestamp,
            "trade_id": self.trade_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Trade':
        """Create Trade from dict with proper decimal conversion"""
        return cls(
            exchange=Exchange(data["exchange"]),
            symbol=data["symbol"],
            price=round_price(data["price"]),
            quantity=round_quantity(data["quantity"]),
            side=Side(data["side"]),
            timestamp=data["timestamp"],
            trade_id=data["trade_id"]
        )

@dataclass
class OrderBookLevel:
    """Single orderbook level with institutional precision"""
    price: Decimal
    quantity: Decimal
    
    def __post_init__(self):
        """Ensure proper precision"""
        if not isinstance(self.price, Decimal):
            self.price = round_price(self.price)
        if not isinstance(self.quantity, Decimal):
            self.quantity = round_quantity(self.quantity)

@dataclass
class OrderBook:
    """Orderbook snapshot with institutional precision"""
    exchange: Exchange
    symbol: str
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "exchange": self.exchange.value,
            "symbol": self.symbol,
            "bids": [[float(b.price), float(b.quantity)] for b in self.bids],
            "asks": [[float(a.price), float(a.quantity)] for a in self.asks],
            "timestamp": self.timestamp
        }

@dataclass
class VolumeProfile:
    """Volume profile indicator with institutional precision"""
    symbol: str
    exchange: Exchange
    timestamp: datetime
    poc: Decimal  # Point of Control
    vah: Decimal  # Value Area High
    val: Decimal  # Value Area Low
    volume_distribution: Dict[Decimal, Decimal]  # price -> volume
    total_volume: Decimal
    
    def __post_init__(self):
        """Ensure proper precision"""
        if not isinstance(self.poc, Decimal):
            self.poc = round_price(self.poc)
        if not isinstance(self.vah, Decimal):
            self.vah = round_price(self.vah)
        if not isinstance(self.val, Decimal):
            self.val = round_price(self.val)
        if not isinstance(self.total_volume, Decimal):
            self.total_volume = round_quantity(self.total_volume)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange.value,
            "timestamp": self.timestamp,
            "poc": float(self.poc),
            "vah": float(self.vah),
            "val": float(self.val),
            "volume_distribution": {
                float(k): float(v) for k, v in self.volume_distribution.items()
            },
            "total_volume": float(self.total_volume)
        }

@dataclass
class OrderFlow:
    """Order flow indicator with institutional precision"""
    symbol: str
    exchange: Exchange
    timestamp: datetime
    buy_volume: Decimal
    sell_volume: Decimal
    delta: Decimal  # buy_volume - sell_volume
    cumulative_delta: Decimal
    imbalance_ratio: Decimal  # normalized 0-1 (buy_volume / total_volume)
    large_trades_count: int
    absorption_detected: bool
    momentum_score: Decimal = Decimal("50.0")  # 0-100 score
    institutional_volume: Decimal = Decimal("0.0")  # Volume from large trades
    vwap_delta: Decimal = Decimal("0.0")  # Delta above/below VWAP
    absorption_events: List[Dict[str, Any]] = None  # Detailed absorption events
    
    def __post_init__(self):
        """Initialize optional fields and ensure precision"""
        if self.absorption_events is None:
            self.absorption_events = []
            
        # Ensure proper precision for all decimal fields
        if not isinstance(self.buy_volume, Decimal):
            self.buy_volume = round_quantity(self.buy_volume)
        if not isinstance(self.sell_volume, Decimal):
            self.sell_volume = round_quantity(self.sell_volume)
        if not isinstance(self.delta, Decimal):
            self.delta = round_quantity(self.delta)
        if not isinstance(self.cumulative_delta, Decimal):
            self.cumulative_delta = round_quantity(self.cumulative_delta)
        if not isinstance(self.imbalance_ratio, Decimal):
            self.imbalance_ratio = Decimal(str(self.imbalance_ratio)).quantize(
                Decimal("0.000001"), rounding=ROUND_HALF_UP
            )
        if not isinstance(self.momentum_score, Decimal):
            self.momentum_score = Decimal(str(self.momentum_score)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        if not isinstance(self.institutional_volume, Decimal):
            self.institutional_volume = round_quantity(self.institutional_volume)
        if not isinstance(self.vwap_delta, Decimal):
            self.vwap_delta = round_quantity(self.vwap_delta)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange.value,
            "timestamp": self.timestamp,
            "buy_volume": float(self.buy_volume),
            "sell_volume": float(self.sell_volume),
            "delta": float(self.delta),
            "cumulative_delta": float(self.cumulative_delta),
            "imbalance_ratio": float(self.imbalance_ratio),
            "large_trades_count": self.large_trades_count,
            "absorption_detected": self.absorption_detected,
            "momentum_score": float(self.momentum_score),
            "institutional_volume": float(self.institutional_volume),
            "vwap_delta": float(self.vwap_delta),
            "absorption_events": self.absorption_events or []
        }

# New models for institutional features

@dataclass
class FootprintBar:
    """Single footprint bar with bid/ask at each price level"""
    timestamp: datetime
    price_levels: Dict[Decimal, Dict[str, Decimal]]  # price -> {bid_volume, ask_volume, delta}
    total_bid_volume: Decimal
    total_ask_volume: Decimal
    total_delta: Decimal
    imbalances: List[Dict[str, Any]]  # Price levels with significant imbalances
    poc_price: Decimal  # Price with most volume in this bar
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "price_levels": {
                float(price): {
                    "bid": float(data["bid_volume"]),
                    "ask": float(data["ask_volume"]),
                    "delta": float(data["delta"])
                } for price, data in self.price_levels.items()
            },
            "total_bid_volume": float(self.total_bid_volume),
            "total_ask_volume": float(self.total_ask_volume),
            "total_delta": float(self.total_delta),
            "imbalances": self.imbalances,
            "poc_price": float(self.poc_price)
        }

@dataclass
class MarketProfile:
    """Market Profile with TPO (Time Price Opportunity)"""
    symbol: str
    exchange: Exchange
    session_start: datetime
    session_end: datetime
    price_levels: Dict[Decimal, int]  # price -> TPO count
    poc: Decimal  # Point of Control
    vah: Decimal  # Value Area High  
    val: Decimal  # Value Area Low
    initial_balance_high: Decimal
    initial_balance_low: Decimal
    profile_type: str  # 'b', 'p', 'D', etc.
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange.value,
            "session_start": self.session_start,
            "session_end": self.session_end,
            "price_levels": {float(k): v for k, v in self.price_levels.items()},
            "poc": float(self.poc),
            "vah": float(self.vah),
            "val": float(self.val),
            "initial_balance_high": float(self.initial_balance_high),
            "initial_balance_low": float(self.initial_balance_low),
            "profile_type": self.profile_type
        }

@dataclass
class LiquidationLevel:
    """Estimated liquidation level"""
    price: Decimal
    estimated_volume: Decimal
    leverage: int
    side: Side  # Which side gets liquidated
    exchange: Exchange
    confidence: Decimal  # 0-1 confidence score
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "price": float(self.price),
            "estimated_volume": float(self.estimated_volume),
            "leverage": self.leverage,
            "side": self.side.value,
            "exchange": self.exchange.value,
            "confidence": float(self.confidence)
        }
