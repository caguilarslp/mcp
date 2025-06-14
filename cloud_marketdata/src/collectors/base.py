"""
Abstract WebSocket Collector Base Class

Template pattern para implementar collectors de diferentes exchanges
con manejo estándar de conexiones, reconexión y procesamiento.
"""

import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from datetime import datetime

import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from ..core.logger import get_logger


class CollectorStatus(str, Enum):
    """Estado del collector"""
    STOPPED = "stopped"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    SUBSCRIBING = "subscribing"
    ACTIVE = "active"
    RECONNECTING = "reconnecting"
    ERROR = "error"


class WebSocketCollector(ABC):
    """
    Abstract base class para WebSocket collectors
    
    Implementa el patrón Template Method para manejo de conexiones WebSocket
    con reconnection logic, health monitoring y processing standardizado.
    """
    
    def __init__(
        self,
        name: str,
        websocket_url: str,
        symbols: List[str],
        max_reconnect_attempts: int = 10,
        reconnect_delay_base: float = 1.0,
        reconnect_delay_max: float = 30.0,
        ping_interval: float = 20.0,
        ping_timeout: float = 10.0
    ):
        """
        Initialize WebSocket collector
        
        Args:
            name: Collector name for logging/identification
            websocket_url: WebSocket URL to connect to
            symbols: List of symbols to subscribe to
            max_reconnect_attempts: Maximum reconnection attempts
            reconnect_delay_base: Base delay for exponential backoff
            reconnect_delay_max: Maximum delay between reconnection attempts
            ping_interval: Ping interval in seconds
            ping_timeout: Ping timeout in seconds
        """
        self.name = name
        self.websocket_url = websocket_url
        self.symbols = symbols
        self.max_reconnect_attempts = max_reconnect_attempts
        self.reconnect_delay_base = reconnect_delay_base
        self.reconnect_delay_max = reconnect_delay_max
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        
        # Internal state
        self._status = CollectorStatus.STOPPED
        self._websocket: Optional[websockets.WebSocketServerProtocol] = None
        self._task: Optional[asyncio.Task] = None
        self._reconnect_attempts = 0
        self._last_message_time = 0.0
        self._subscribed_symbols: Set[str] = set()
        self._stats = {
            "messages_received": 0,
            "messages_processed": 0,
            "errors": 0,
            "reconnections": 0,
            "uptime_start": None,
        }
        
        self.logger = get_logger(f"collector.{name}")
    
    # Public Interface
    
    async def start(self) -> None:
        """Start the collector"""
        if self._task and not self._task.done():
            self.logger.warning("Collector already running")
            return
        
        self.logger.info(f"Starting collector {self.name}")
        self._stats["uptime_start"] = datetime.now()
        self._status = CollectorStatus.CONNECTING
        
        # Get current event loop
        loop = asyncio.get_event_loop()
        self.logger.debug(f"Creating task in event loop: {loop}")
        
        # Create and ensure task is scheduled
        self._task = loop.create_task(self._run())
        
        # Force task to start
        await asyncio.sleep(0)  # Yield control to allow task to start
        
        self.logger.info(f"Collector {self.name} task created, task: {self._task}, status: {self._status}")
    
    async def stop(self) -> None:
        """Stop the collector gracefully"""
        self.logger.info(f"Stopping collector {self.name}")
        self._status = CollectorStatus.STOPPED
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        if self._websocket:
            await self._websocket.close()
            self._websocket = None
        
        self.logger.info(f"Collector {self.name} stopped")
    
    @property
    def status(self) -> CollectorStatus:
        """Get current collector status"""
        return self._status
    
    @property
    def stats(self) -> Dict[str, Any]:
        """Get collector statistics"""
        stats = self._stats.copy()
        if stats["uptime_start"]:
            stats["uptime_seconds"] = (datetime.now() - stats["uptime_start"]).total_seconds()
        stats["subscribed_symbols"] = list(self._subscribed_symbols)
        stats["last_message_time"] = self._last_message_time
        return stats
    
    @property
    def is_healthy(self) -> bool:
        """Check if collector is healthy"""
        if self._status not in [CollectorStatus.ACTIVE, CollectorStatus.CONNECTED]:
            return False
        
        # Check if we received messages recently (within 60 seconds)
        if self._last_message_time > 0:
            time_since_last_message = time.time() - self._last_message_time
            return time_since_last_message < 60.0
        
        return True
    
    # Template Methods (to be overridden by subclasses)
    
    @abstractmethod
    async def create_subscription_message(self, symbols: List[str]) -> str:
        """
        Create subscription message for the exchange
        
        Args:
            symbols: List of symbols to subscribe to
            
        Returns:
            JSON string of subscription message
        """
        pass
    
    @abstractmethod
    async def process_message(self, message: Dict[str, Any]) -> None:
        """
        Process received WebSocket message
        
        Args:
            message: Parsed JSON message from WebSocket
        """
        pass
    
    async def on_connected(self) -> None:
        """Called when WebSocket connection is established"""
        self.logger.info(f"WebSocket connected to {self.websocket_url}")
    
    async def on_subscribed(self, symbols: List[str]) -> None:
        """Called when symbols are successfully subscribed"""
        self._subscribed_symbols.update(symbols)
        self.logger.info(f"Subscribed to symbols: {symbols}")
    
    async def on_disconnected(self) -> None:
        """Called when WebSocket connection is lost"""
        self.logger.warning("WebSocket disconnected")
        self._subscribed_symbols.clear()
    
    async def on_error(self, error: Exception) -> None:
        """Called when an error occurs"""
        self._stats["errors"] += 1
        self.logger.error(f"Collector error: {error}")
    
    # Private Implementation
    
    async def _run(self) -> None:
        """Main collector loop with reconnection logic"""
        self.logger.debug(f"Starting main loop for {self.name}")
        while self._status != CollectorStatus.STOPPED:
            try:
                self.logger.debug(f"Attempting to connect {self.name} to {self.websocket_url}")
                await self._connect_and_run()
            except asyncio.CancelledError:
                self.logger.info(f"Collector {self.name} cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in collector {self.name}: {type(e).__name__}: {e}")
                await self.on_error(e)
                if self._status != CollectorStatus.STOPPED:
                    await self._handle_reconnection()
    
    async def _connect_and_run(self) -> None:
        """Connect to WebSocket and start processing"""
        self._status = CollectorStatus.CONNECTING
        
        try:
            # Connect to WebSocket
            self.logger.info(f"Connecting to WebSocket: {self.websocket_url}")
            self._websocket = await websockets.connect(
                self.websocket_url,
                ping_interval=self.ping_interval,
                ping_timeout=self.ping_timeout,
                close_timeout=10.0
            )
            self.logger.info(f"WebSocket connection established for {self.name}")
            
            self._status = CollectorStatus.CONNECTED
            await self.on_connected()
            
            # Subscribe to symbols
            if self.symbols:
                await self._subscribe()
            
            # Start message processing loop
            await self._message_loop()
            
        except (ConnectionClosed, WebSocketException) as e:
            self.logger.warning(f"WebSocket connection error: {e}")
            await self.on_disconnected()
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error in connection: {e}")
            await self.on_error(e)
            raise
    
    async def _subscribe(self) -> None:
        """Subscribe to symbols"""
        self._status = CollectorStatus.SUBSCRIBING
        
        try:
            subscription_message = await self.create_subscription_message(self.symbols)
            await self._websocket.send(subscription_message)
            
            self._status = CollectorStatus.ACTIVE
            await self.on_subscribed(self.symbols)
            
        except Exception as e:
            self.logger.error(f"Failed to subscribe: {e}")
            raise
    
    async def _message_loop(self) -> None:
        """Process incoming WebSocket messages"""
        try:
            async for raw_message in self._websocket:
                self._stats["messages_received"] += 1
                self._last_message_time = time.time()
                
                try:
                    # Parse JSON message
                    message = json.loads(raw_message)
                    
                    # Process message
                    await self.process_message(message)
                    self._stats["messages_processed"] += 1
                    
                except json.JSONDecodeError as e:
                    self.logger.warning(f"Failed to parse message: {e}")
                except Exception as e:
                    self.logger.error(f"Failed to process message: {e}")
                    await self.on_error(e)
                
        except ConnectionClosed:
            self.logger.info("WebSocket connection closed")
            await self.on_disconnected()
        except Exception as e:
            self.logger.error(f"Error in message loop: {e}")
            await self.on_error(e)
            raise
    
    async def _handle_reconnection(self) -> None:
        """Handle reconnection with exponential backoff"""
        if self._reconnect_attempts >= self.max_reconnect_attempts:
            self.logger.error(f"Max reconnection attempts ({self.max_reconnect_attempts}) reached")
            self._status = CollectorStatus.ERROR
            return
        
        self._status = CollectorStatus.RECONNECTING
        self._reconnect_attempts += 1
        self._stats["reconnections"] += 1
        
        # Calculate delay with exponential backoff
        delay = min(
            self.reconnect_delay_base * (2 ** (self._reconnect_attempts - 1)),
            self.reconnect_delay_max
        )
        
        self.logger.info(f"Reconnecting in {delay:.1f}s (attempt {self._reconnect_attempts}/{self.max_reconnect_attempts})")
        await asyncio.sleep(delay)
        
        # Reset connection
        if self._websocket:
            await self._websocket.close()
            self._websocket = None
    
    def _reset_reconnection_counter(self) -> None:
        """Reset reconnection counter on successful connection"""
        if self._reconnect_attempts > 0:
            self.logger.info("Connection restored, resetting reconnection counter")
            self._reconnect_attempts = 0
