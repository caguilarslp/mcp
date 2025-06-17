"""
Binance WebSocket collector for Spot and Futures.
"""

import json
from decimal import Decimal
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .base import BaseWebSocketCollector
from core.entities import Trade, OrderBook, OrderBookLevel, Kline
from core.types import Symbol, Side, ExchangeName


class BinanceCollector(BaseWebSocketCollector):
    """
    Binance WebSocket collector for Spot trading.
    
    Supports:
    - Individual symbol streams
    - Trade data
    - Order book data (partial book depth)
    - Kline data (multiple intervals)
    
    API Documentation: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
    """
    
    def __init__(self, symbols: List[Symbol], market_type: str = "spot", **kwargs):
        super().__init__(
            exchange=ExchangeName.BINANCE,
            symbols=symbols,
            **kwargs
        )
        
        # Binance specific settings
        self.market_type = market_type  # "spot" or "futures"
        self._stream_id = 1
        
        # Symbol format mapping (BTCUSDT -> btcusdt for Binance)
        self._symbol_map = {symbol: symbol.lower() for symbol in symbols}
    
    @property
    def websocket_url(self) -> str:
        """Binance WebSocket URL based on market type."""
        if self.market_type == "futures":
            return "wss://fstream.binance.com/ws"
        else:
            return "wss://stream.binance.com:9443/ws"
    
    async def _build_subscription_message(self, symbols: List[Symbol]) -> Dict[str, Any]:
        """
        Build Binance subscription message.
        
        Binance uses a combined stream approach where we specify all streams in the URL
        or use SUBSCRIBE method for individual streams.
        """
        streams = []
        
        for symbol in symbols:
            binance_symbol = self._symbol_map[symbol]
            streams.extend([
                f"{binance_symbol}@trade",           # Individual trades
                f"{binance_symbol}@depth20@100ms",   # Order book depth (20 levels, 100ms)
                f"{binance_symbol}@kline_1m",        # 1-minute klines
                f"{binance_symbol}@kline_5m",        # 5-minute klines
                f"{binance_symbol}@kline_15m",       # 15-minute klines
                f"{binance_symbol}@kline_1h",        # 1-hour klines
                f"{binance_symbol}@kline_4h",        # 4-hour klines
                f"{binance_symbol}@kline_1d",        # Daily klines
            ])
        
        self._stream_id += 1
        
        return {
            "method": "SUBSCRIBE",
            "params": streams,
            "id": self._stream_id
        }
    
    def _get_ping_message(self) -> Dict[str, Any]:
        """Binance doesn't require ping messages (handled by underlying websockets)."""
        return {}  # Binance handles ping/pong automatically
    
    async def _parse_message(self, message: Dict[str, Any]) -> Optional[Any]:
        """
        Parse Binance WebSocket message.
        
        Message format:
        {
            "stream": "btcusdt@trade",
            "data": {
                "e": "trade",
                "E": 1672324800000,
                "s": "BTCUSDT",
                "t": 12345,
                ...
            }
        }
        """
        # Handle subscription confirmations
        if "result" in message:
            if message.get("result") is None:  # None means success
                self.logger.info("Binance subscription confirmed", id=message.get("id"))
            else:
                self.logger.error("Binance subscription failed", message=message)
            return None
        
        # Handle error messages
        if "error" in message:
            self.logger.error("Binance WebSocket error", error=message["error"])
            return None
        
        # Handle data messages
        stream = message.get("stream", "")
        data = message.get("data", {})
        
        if not stream or not data:
            return None
        
        # Parse stream to extract symbol and data type
        stream_parts = stream.split("@")
        if len(stream_parts) != 2:
            return None
        
        symbol_raw = stream_parts[0].upper()
        stream_type = stream_parts[1]
        
        # Convert to our symbol format
        our_symbol = Symbol(symbol_raw)
        
        if stream_type == "trade":
            return await self._parse_trade_data(our_symbol, data)
        elif stream_type.startswith("depth"):
            return await self._parse_orderbook_data(our_symbol, data)
        elif stream_type.startswith("kline_"):
            interval = stream_type.replace("kline_", "")
            return await self._parse_kline_data(our_symbol, data, interval)
        
        return None
    
    async def _parse_trade_data(self, symbol: Symbol, data: Dict[str, Any]) -> Optional[Trade]:
        """
        Parse Binance trade data.
        
        Data format:
        {
            "e": "trade",
            "E": 1672324800000,
            "s": "BTCUSDT",
            "t": 12345,
            "p": "16596.50",
            "q": "0.012",
            "b": 88,
            "a": 50,
            "T": 1672324800000,
            "m": true,
            "M": true
        }
        """
        try:
            return Trade(
                id=str(data["t"]),
                symbol=symbol,
                exchange=self.exchange,
                price=Decimal(data["p"]),
                quantity=Decimal(data["q"]),
                side=Side.SELL if data["m"] else Side.BUY,  # m=true means buyer was maker (so trade was sell)
                timestamp=datetime.fromtimestamp(data["T"] / 1000, tz=timezone.utc),
                is_buyer_maker=data["m"]
            )
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Binance trade", error=str(e), data=data)
            return None
    
    async def _parse_orderbook_data(self, symbol: Symbol, data: Dict[str, Any]) -> Optional[OrderBook]:
        """
        Parse Binance orderbook data.
        
        Data format:
        {
            "lastUpdateId": 160,
            "bids": [["0.0024", "10"]],
            "asks": [["0.0026", "100"]]
        }
        """
        try:
            # Parse bids (should already be sorted highest to lowest)
            bids = []
            for bid in data.get("bids", []):
                if len(bid) >= 2:
                    bids.append(OrderBookLevel(
                        price=Decimal(bid[0]),
                        quantity=Decimal(bid[1])
                    ))
            
            # Parse asks (should already be sorted lowest to highest)
            asks = []
            for ask in data.get("asks", []):
                if len(ask) >= 2:
                    asks.append(OrderBookLevel(
                        price=Decimal(ask[0]),
                        quantity=Decimal(ask[1])
                    ))
            
            return OrderBook(
                symbol=symbol,
                exchange=self.exchange,
                timestamp=datetime.now(timezone.utc),  # Binance doesn't provide timestamp in depth
                bids=bids,
                asks=asks,
                sequence=data.get("lastUpdateId")
            )
        
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Binance orderbook", error=str(e), data=data)
            return None
    
    async def _parse_kline_data(
        self, 
        symbol: Symbol, 
        data: Dict[str, Any], 
        interval: str
    ) -> Optional[Kline]:
        """
        Parse Binance kline data.
        
        Data format:
        {
            "e": "kline",
            "E": 1672324800000,
            "s": "BTCUSDT",
            "k": {
                "t": 1672324800000,
                "T": 1672324859999,
                "s": "BTCUSDT",
                "i": "1m",
                "f": 100,
                "L": 200,
                "o": "16649.00",
                "c": "16649.00",
                "h": "16649.00",
                "l": "16649.00",
                "v": "0.081",
                "n": 100,
                "x": false,
                "q": "1.34869",
                "V": "0.040",
                "Q": "0.67435",
                "B": "0"
            }
        }
        """
        try:
            kline = data["k"]
            
            return Kline(
                symbol=symbol,
                exchange=self.exchange,
                interval=interval,
                open_time=datetime.fromtimestamp(kline["t"] / 1000, tz=timezone.utc),
                close_time=datetime.fromtimestamp(kline["T"] / 1000, tz=timezone.utc),
                open_price=Decimal(kline["o"]),
                high_price=Decimal(kline["h"]),
                low_price=Decimal(kline["l"]),
                close_price=Decimal(kline["c"]),
                volume=Decimal(kline["v"]),
                quote_volume=Decimal(kline["q"]),
                trades_count=kline["n"],
                taker_buy_volume=Decimal(kline["V"]),
                taker_buy_quote_volume=Decimal(kline["Q"]),
                is_closed=kline["x"]
            )
        
        except (KeyError, ValueError, TypeError) as e:
            self.logger.warning("Failed to parse Binance kline", error=str(e), data=data)
            return None
    
    def _format_symbol_for_binance(self, symbol: Symbol) -> str:
        """Format symbol for Binance API (lowercase)."""
        return str(symbol).lower()
    
    def get_supported_intervals(self) -> List[str]:
        """Get list of supported kline intervals."""
        return [
            "1m", "3m", "5m", "15m", "30m", 
            "1h", "2h", "4h", "6h", "8h", "12h",
            "1d", "3d", "1w", "1M"
        ]
    
    def get_max_symbols_per_connection(self) -> int:
        """Maximum number of symbols per WebSocket connection."""
        return 100  # Binance supports many symbols per connection
    
    async def _handle_unsubscribe(self, symbols: List[Symbol]) -> None:
        """Handle unsubscription from symbols."""
        streams = []
        
        for symbol in symbols:
            binance_symbol = self._symbol_map.get(symbol, symbol.lower())
            streams.extend([
                f"{binance_symbol}@trade",
                f"{binance_symbol}@depth20@100ms",
                f"{binance_symbol}@kline_1m",
                f"{binance_symbol}@kline_5m",
                f"{binance_symbol}@kline_15m",
                f"{binance_symbol}@kline_1h",
                f"{binance_symbol}@kline_4h",
                f"{binance_symbol}@kline_1d",
            ])
        
        self._stream_id += 1
        
        unsubscribe_msg = {
            "method": "UNSUBSCRIBE",
            "params": streams,
            "id": self._stream_id
        }
        
        await self._send_message(unsubscribe_msg)
