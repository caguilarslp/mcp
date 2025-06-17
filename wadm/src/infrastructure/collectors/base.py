"""
Base WebSocket collector with connection management and error handling.
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Callable, List, Set
from datetime import datetime, timezone
import websockets
from websockets.exceptions import ConnectionClosed, InvalidStatusCode
import structlog

from core.entities import Trade, OrderBook, Kline
from core.types import Symbol, Exchange

logger = structlog.get_logger(__name__)


class BaseWebSocketCollector(ABC):
    """
    Abstract base class for WebSocket market data collectors.
    
    Provides common functionality for:
    - Connection management with auto-reconnection
    - Message handling and parsing
    - Error handling and logging
    - Rate limiting and backoff
    """
    
    def __init__(
        self,
        exchange: Exchange,
        symbols: List[Symbol],
        on_trade: Optional[Callable[[Trade], None]] = None,
        on_orderbook: Optional[Callable[[OrderBook], None]] = None,
        on_kline: Optional[Callable[[Kline], None]] = None,
        max_reconnect_attempts: int = 10,
        reconnect_delay: float = 5.0,
        ping_interval: float = 20.0,
        ping_timeout: float = 10.0,
    ):
        self.exchange = exchange
        self.symbols = set(symbols)
        self.on_trade = on_trade
        self.on_orderbook = on_orderbook
        self.on_kline = on_kline
        
        # Connection management
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.is_connected = False
        self.is_running = False
        self._reconnect_attempts = 0
        self.max_reconnect_attempts = max_reconnect_attempts
        self.reconnect_delay = reconnect_delay
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        
        # Subscriptions
        self._subscribed_symbols: Set[Symbol] = set()
        
        # Message buffer for handling partial messages
        self._message_buffer = ""
        
        # Statistics
        self.stats = {
            "messages_received": 0,
            "messages_processed": 0,
            "errors": 0,
            "reconnections": 0,
            "last_message_time": None,
            "trades_received": 0,
            "orderbooks_received": 0,
            "klines_received": 0,
        }
        
        self.logger = logger.bind(
            exchange=exchange,
            symbols=list(symbols),
            collector=self.__class__.__name__
        )
    
    @property
    @abstractmethod
    def websocket_url(self) -> str:
        """WebSocket URL for the exchange."""
        pass
    
    @abstractmethod
    async def _build_subscription_message(self, symbols: List[Symbol]) -> Dict[str, Any]:
        """Build subscription message for the exchange."""
        pass
    
    @abstractmethod
    async def _parse_message(self, message: Dict[str, Any]) -> Optional[Any]:
        """Parse incoming message and return trade, orderbook, or kline."""
        pass
    
    @abstractmethod
    def _get_ping_message(self) -> Dict[str, Any]:
        """Get ping message for the exchange."""
        pass
    
    async def start(self) -> None:
        """Start the WebSocket collector."""
        if self.is_running:
            self.logger.warning("Collector already running")
            return
        
        self.is_running = True
        self.logger.info("Starting WebSocket collector")
        
        while self.is_running:
            try:
                await self._connect_and_run()
            except Exception as e:
                self.logger.error("Unexpected error in collector", error=str(e))
                if self.is_running:
                    await self._handle_reconnection()
                else:
                    break
    
    async def stop(self) -> None:
        """Stop the WebSocket collector."""
        self.logger.info("Stopping WebSocket collector")
        self.is_running = False
        
        if self.websocket and not self.websocket.closed:
            await self.websocket.close()
        
        self.is_connected = False
    
    async def add_symbol(self, symbol: Symbol) -> None:
        """Add a symbol to the subscription."""
        if symbol in self.symbols:
            return
        
        self.symbols.add(symbol)
        
        if self.is_connected:
            await self._subscribe_symbol(symbol)
    
    async def remove_symbol(self, symbol: Symbol) -> None:
        """Remove a symbol from the subscription."""
        if symbol not in self.symbols:
            return
        
        self.symbols.remove(symbol)
        self._subscribed_symbols.discard(symbol)
        
        # Note: Most exchanges don't support unsubscription
        # Would need to reconnect to fully remove
    
    async def _connect_and_run(self) -> None:
        """Connect to WebSocket and run message loop."""
        try:
            self.logger.info("Connecting to WebSocket", url=self.websocket_url)
            
            async with websockets.connect(
                self.websocket_url,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
                close_timeout=10,
                max_size=2**20,  # 1MB max message size
                compression=None,  # Disable compression for speed
            ) as websocket:
                self.websocket = websocket
                self.is_connected = True
                self._reconnect_attempts = 0
                
                self.logger.info("WebSocket connected successfully")
                
                # Subscribe to symbols
                await self._subscribe_all()
                
                # Start message loop
                await self._message_loop()
                
        except (ConnectionClosed, InvalidStatusCode, OSError) as e:
            self.logger.warning("WebSocket connection error", error=str(e))
            raise
        except Exception as e:
            self.logger.error("Unexpected connection error", error=str(e))
            raise
        finally:
            self.is_connected = False
            if self.websocket:
                self.websocket = None
    
    async def _subscribe_all(self) -> None:
        """Subscribe to all symbols."""
        if not self.symbols:
            return
        
        symbols_to_subscribe = [s for s in self.symbols if s not in self._subscribed_symbols]
        
        if symbols_to_subscribe:
            subscription_msg = await self._build_subscription_message(symbols_to_subscribe)
            await self._send_message(subscription_msg)
            self._subscribed_symbols.update(symbols_to_subscribe)
            
            self.logger.info(
                "Subscribed to symbols",
                symbols=symbols_to_subscribe,
                total_subscriptions=len(self._subscribed_symbols)
            )
    
    async def _subscribe_symbol(self, symbol: Symbol) -> None:
        """Subscribe to a single symbol."""
        if symbol in self._subscribed_symbols:
            return
        
        subscription_msg = await self._build_subscription_message([symbol])
        await self._send_message(subscription_msg)
        self._subscribed_symbols.add(symbol)
        
        self.logger.info("Subscribed to symbol", symbol=symbol)
    
    async def _send_message(self, message: Dict[str, Any]) -> None:
        """Send message to WebSocket."""
        if not self.websocket or not self.is_connected:
            raise RuntimeError("WebSocket not connected")
        
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as e:
            self.logger.error("Failed to send message", message=message, error=str(e))
            raise
    
    async def _message_loop(self) -> None:
        """Main message processing loop."""
        async for message in self.websocket:
            try:
                await self._handle_message(message)
            except Exception as e:
                self.stats["errors"] += 1
                self.logger.error("Error handling message", error=str(e), message=message[:100])
    
    async def _handle_message(self, raw_message: str) -> None:
        """Handle incoming WebSocket message."""
        self.stats["messages_received"] += 1
        self.stats["last_message_time"] = datetime.now(timezone.utc)
        
        try:
            # Handle potential partial messages
            self._message_buffer += raw_message
            
            # Try to parse complete JSON messages
            while self._message_buffer:
                try:
                    message = json.loads(self._message_buffer)
                    self._message_buffer = ""
                    break
                except json.JSONDecodeError:
                    # Might be partial message, wait for more data
                    if len(self._message_buffer) > 10000:  # Prevent memory issues
                        self.logger.warning("Dropping large incomplete message")
                        self._message_buffer = ""
                    return
            
            # Process the complete message
            parsed_data = await self._parse_message(message)
            
            if parsed_data:
                await self._dispatch_data(parsed_data)
                self.stats["messages_processed"] += 1
            
        except json.JSONDecodeError as e:
            self.logger.warning("Invalid JSON message", error=str(e))
            self._message_buffer = ""  # Reset buffer on JSON error
        except Exception as e:
            self.logger.error("Error processing message", error=str(e))
    
    async def _dispatch_data(self, data: Any) -> None:
        """Dispatch parsed data to appropriate handlers."""
        if isinstance(data, Trade) and self.on_trade:
            self.stats["trades_received"] += 1
            await self._safe_callback(self.on_trade, data)
            
        elif isinstance(data, OrderBook) and self.on_orderbook:
            self.stats["orderbooks_received"] += 1
            await self._safe_callback(self.on_orderbook, data)
            
        elif isinstance(data, Kline) and self.on_kline:
            self.stats["klines_received"] += 1
            await self._safe_callback(self.on_kline, data)
    
    async def _safe_callback(self, callback: Callable, data: Any) -> None:
        """Safely execute callback with error handling."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)
        except Exception as e:
            self.logger.error("Error in callback", callback=callback.__name__, error=str(e))
    
    async def _handle_reconnection(self) -> None:
        """Handle reconnection logic with exponential backoff."""
        if not self.is_running:
            return
        
        self._reconnect_attempts += 1
        
        if self._reconnect_attempts > self.max_reconnect_attempts:
            self.logger.error(
                "Max reconnection attempts reached, stopping collector",
                attempts=self._reconnect_attempts
            )
            self.is_running = False
            return
        
        delay = min(self.reconnect_delay * (2 ** (self._reconnect_attempts - 1)), 300)  # Max 5 min
        
        self.logger.info(
            "Reconnecting in delay seconds",
            attempt=self._reconnect_attempts,
            delay=delay,
            max_attempts=self.max_reconnect_attempts
        )
        
        self.stats["reconnections"] += 1
        await asyncio.sleep(delay)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get collector statistics."""
        return {
            **self.stats,
            "is_connected": self.is_connected,
            "is_running": self.is_running,
            "subscribed_symbols": list(self._subscribed_symbols),
            "reconnect_attempts": self._reconnect_attempts,
        }
    
    def reset_stats(self) -> None:
        """Reset statistics counters."""
        self.stats = {
            "messages_received": 0,
            "messages_processed": 0,
            "errors": 0,
            "reconnections": 0,
            "last_message_time": None,
            "trades_received": 0,
            "orderbooks_received": 0,
            "klines_received": 0,
        }
        self._reconnect_attempts = 0
