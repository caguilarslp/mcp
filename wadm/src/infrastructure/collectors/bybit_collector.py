"""
Bybit WebSocket collector for v5 API.
"""

import json
from decimal import Decimal
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .base import BaseWebSocketCollector
from core.entities import Trade, OrderBook, OrderBookLevel, Kline
from core.types import Symbol, Side, ExchangeName


class BybitCollector(BaseWebSocketCollector):
    """
    Bybit WebSocket collector implementing v5 API.
    
    Supports:
    - Public trade data
    - Order book data (200 levels)
    - Kline data (multiple intervals)
    
    API Documentation: https://bybit-exchange.github.io/docs/v5/websocket/public/
    """
    
    def __init__(self, symbols: List[Symbol], **kwargs):
        super().__init__(
            exchange=ExchangeName.BYBIT,
            symbols=symbols,
            **kwargs
        )
        
        # Bybit specific settings
        self._categories = ["spot", "linear"]  # Support spot and futures
        self._subscription_id = 1
        
        # Symbol format mapping (BTCUSDT -> BTCUSDT for Bybit)
        self._symbol_map = {symbol: symbol for symbol in symbols}
    
    @property
    def websocket_url(self) -> str:
        """Bybit v5 public WebSocket URL."""
        return "wss://stream.bybit.com/v5/public/spot"
    
    async def _build_subscription_message(self, symbols: List[Symbol]) -> Dict[str, Any]:
        """
        Build Bybit v5 subscription message.
        
        Subscribe to:
        - publicTrade for trade data
        - orderbook.200 for order book data
        - kline.1m for 1-minute klines
        
        Note: Bybit limits to 10 args per subscription, so we prioritize essential streams.
        """
        topics = []
        
        for symbol in symbols:
            bybit_symbol = self._symbol_map[symbol]
            # Prioritize most important streams to stay within 10 arg limit
            topics.extend([
                f"publicTrade.{bybit_symbol}",
                f"orderbook.200.{bybit_symbol}",
                f"kline.1.{bybit_symbol}",        # 1 minute only for now
            ])
        
        self._subscription_id += 1
        
        return {
            "op": "subscribe",
            "args": topics[:10],  # Limit to 10 args max
            "req_id": str(self._subscription_id)
        }
    
    def _get_ping_message(self) -> Dict[str, Any]:
        """Bybit v5 ping message."""
        return {"op": "ping"}
    
    async def _parse_message(self, message: Dict[str, Any]) -> Optional[Any]:
        """
        Parse Bybit v5 WebSocket message.
        
        Message format:
        {
            "topic": "publicTrade.BTCUSDT",
            "type": "snapshot",
            "ts": 1672324800000,
            "data": [...]
        }
        """
        # Handle subscription confirmations
        if message.get("op") == "subscribe":
            if message.get("success"):
                self.logger.info("Bybit subscription confirmed", req_id=message.get("req_id"))
            else:
                self.logger.error("Bybit subscription failed", message=message)
            return None
        
        # Handle pong responses
        if message.get("op") == "pong":
            return None
        
        # Handle data messages
        topic = message.get("topic", "")
        data = message.get("data", [])
        timestamp_ms = message.get("ts", 0)
        
        if not topic or not data:
            return None
        
        # Parse topic to extract symbol and data type
        topic_parts = topic.split(".")
        if len(topic_parts) < 2:
            return None
        
        data_type = topic_parts[0]
        symbol = topic_parts[-1] if topic_parts else ""
        
        # Convert back to our symbol format
        our_symbol = Symbol(symbol)
        
        if data_type == "publicTrade":
            return await self._parse_trade_data(our_symbol, data, timestamp_ms)
        elif data_type == "orderbook":
            return await self._parse_orderbook_data(our_symbol, data, timestamp_ms)
        elif data_type == "kline":
            interval = topic_parts[1] if len(topic_parts) > 2 else "1"
            # Convert Bybit interval format to standard format
            interval_map = {
                "1": "1m",
                "5": "5m", 
                "15": "15m",
                "60": "1h",
                "240": "4h",
                "D": "1d"
            }
            standard_interval = interval_map.get(interval, interval)
            return await self._parse_kline_data(our_symbol, data, standard_interval, timestamp_ms)
        
        return None
    
    async def _parse_trade_data(
        self, 
        symbol: Symbol, 
        data: List[Dict[str, Any]], 
        timestamp_ms: int
    ) -> Optional[Trade]:
        """
        Parse Bybit trade data.
        
        Data format (updated for v5):
        {
            "i": "2290000000838719315",
            "T": 1750183369838,
            "p": "103889.4",
            "v": "0.0001",
            "S": "Sell",
            "s": "BTCUSDT",
            "BT": false,
            "RPI": false
        }
        """
        if not data:
            return None
        
        # Take the first trade (most recent)
        trade_data = data[0]
        
        try:
            return Trade(
                id=trade_data["i"],  # Changed from "execId" to "i"
                symbol=symbol,
                exchange=self.exchange,
                price=Decimal(trade_data["p"]),  # Changed from "price" to "p"
                quantity=Decimal(trade_data["v"]),  # Changed from "size" to "v"
                side=Side.BUY if trade_data["S"] == "Buy" else Side.SELL,  # Changed from "side" to "S"
                timestamp=datetime.fromtimestamp(int(trade_data["T"]) / 1000, tz=timezone.utc),  # Changed from "time" to "T"
                is_buyer_maker=trade_data["S"] == "Sell"  # In Bybit, Sell means buyer was maker
            )
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Bybit trade", error=str(e), data=trade_data)
            return None
    
    async def _parse_orderbook_data(
        self, 
        symbol: Symbol, 
        data: List[Dict[str, Any]], 
        timestamp_ms: int
    ) -> Optional[OrderBook]:
        """
        Parse Bybit orderbook data.
        
        Data format:
        {
            "s": "BTCUSDT",
            "b": [["16493.5", "0.021"], ["16493", "0.025"]],  # bids
            "a": [["16497", "0.125"], ["16497.5", "0.02"]],    # asks
            "u": 177163,
            "seq": 8046152471
        }
        """
        if not data:
            return None
        
        orderbook_data = data[0]
        
        try:
            # Parse bids (highest price first)
            bids = []
            for bid in orderbook_data.get("b", []):
                if len(bid) >= 2:
                    bids.append(OrderBookLevel(
                        price=Decimal(bid[0]),
                        quantity=Decimal(bid[1])
                    ))
            
            # Parse asks (lowest price first)
            asks = []
            for ask in orderbook_data.get("a", []):
                if len(ask) >= 2:
                    asks.append(OrderBookLevel(
                        price=Decimal(ask[0]),
                        quantity=Decimal(ask[1])
                    ))
            
            return OrderBook(
                symbol=symbol,
                exchange=self.exchange,
                timestamp=datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc),
                bids=bids,
                asks=asks,
                sequence=orderbook_data.get("seq")
            )
        
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Bybit orderbook", error=str(e), data=orderbook_data)
            return None
    
    async def _parse_kline_data(
        self, 
        symbol: Symbol, 
        data: List[Dict[str, Any]], 
        interval: str,
        timestamp_ms: int
    ) -> Optional[Kline]:
        """
        Parse Bybit kline data.
        
        Data format:
        {
            "start": 1672324800000,
            "end": 1672324860000,
            "interval": "1",
            "open": "16649",
            "close": "16649",
            "high": "16649",
            "low": "16649",
            "volume": "0.081",
            "turnover": "1.34869",
            "confirm": false,
            "timestamp": 1672324821123
        }
        """
        if not data:
            return None
        
        kline_data = data[0]
        
        try:
            return Kline(
                symbol=symbol,
                exchange=self.exchange,
                interval=interval,
                open_time=datetime.fromtimestamp(kline_data["start"] / 1000, tz=timezone.utc),
                close_time=datetime.fromtimestamp(kline_data["end"] / 1000, tz=timezone.utc),
                open_price=Decimal(kline_data["open"]),
                high_price=Decimal(kline_data["high"]),
                low_price=Decimal(kline_data["low"]),
                close_price=Decimal(kline_data["close"]),
                volume=Decimal(kline_data["volume"]),
                quote_volume=Decimal(kline_data["turnover"]),
                trades_count=0,  # Not provided by Bybit
                taker_buy_volume=Decimal("0"),  # Not provided in public kline
                taker_buy_quote_volume=Decimal("0"),  # Not provided in public kline
                is_closed=kline_data.get("confirm", False)
            )
        
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Bybit kline", error=str(e), data=kline_data)
            return None
    
    async def _handle_connection_specific_setup(self) -> None:
        """Handle any Bybit-specific connection setup."""
        # Send initial ping to keep connection alive
        ping_msg = self._get_ping_message()
        await self._send_message(ping_msg)
    
    def _format_symbol_for_bybit(self, symbol: Symbol) -> str:
        """Format symbol for Bybit API (usually no change needed)."""
        return str(symbol).upper()
    
    def get_supported_intervals(self) -> List[str]:
        """Get list of supported kline intervals."""
        return ["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d", "1w", "1M"]
    
    def _get_bybit_interval(self, standard_interval: str) -> str:
        """Convert standard interval to Bybit format."""
        interval_map = {
            "1m": "1",
            "3m": "3", 
            "5m": "5",
            "15m": "15",
            "30m": "30",
            "1h": "60",
            "2h": "120",
            "4h": "240",
            "6h": "360",
            "12h": "720",
            "1d": "D",
            "1w": "W",
            "1M": "M"
        }
        return interval_map.get(standard_interval, standard_interval)
    
    def get_max_symbols_per_connection(self) -> int:
        """Maximum number of symbols per WebSocket connection."""
        return 100  # Bybit supports many symbols per connection
