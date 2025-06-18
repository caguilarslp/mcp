"""
Core types and enums for WADM.
"""

from enum import Enum
from typing import NewType, Literal


# Type aliases for better type safety
Symbol = NewType('Symbol', str)  # Trading pair symbol like "BTCUSDT"
Exchange = NewType('Exchange', str)  # Exchange name like "binance", "bybit"


class Side(str, Enum):
    """Trade side enum."""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type enum."""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class TrendDirection(str, Enum):
    """Trend direction enum."""
    BULLISH = "bullish"
    BEARISH = "bearish" 
    SIDEWAYS = "sideways"
    UNKNOWN = "unknown"


class LiquidityType(str, Enum):
    """Liquidity level type enum."""
    SUPPORT = "support"
    RESISTANCE = "resistance"
    POC = "poc"  # Point of Control
    VAH = "vah"  # Value Area High
    VAL = "val"  # Value Area Low
    INSTITUTIONAL = "institutional"
    RETAIL = "retail"


class DataType(str, Enum):
    """Data type for WebSocket subscriptions."""
    TRADE = "trade"
    ORDERBOOK = "orderbook"
    KLINE = "kline"
    TICKER = "ticker"


class TimeFrame(str, Enum):
    """Standard timeframe intervals."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"
    MN1 = "1M"


class ExchangeName(str, Enum):
    """Supported exchanges."""
    BINANCE = "binance"
    BYBIT = "bybit"
    OKEX = "okex"
    COINBASE = "coinbase"
    KRAKEN = "kraken"


class CollectorStatus(str, Enum):
    """Collector status enum."""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    RECONNECTING = "reconnecting"
    ERROR = "error"


# Literal types for specific use cases
CollectorType = Literal["trade", "orderbook", "kline", "all"]
SubscriptionMode = Literal["subscribe", "unsubscribe"]
ProcessingMode = Literal["realtime", "batch", "hybrid"]
