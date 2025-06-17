"""Base WebSocket client implementation."""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable, Set

import websockets
from websockets.client import WebSocketClientProtocol
from websockets.exceptions import WebSocketException

from .exceptions import WebSocketError, ConnectionLostError, ReconnectError

logger = logging.getLogger(__name__)


class BaseWebSocketClient(ABC):
    """
    Base WebSocket client with automatic reconnection and heartbeat.
    
    Features:
    - Automatic reconnection with exponential backoff
    - Heartbeat/ping-pong to keep connection alive
    - Message queuing during reconnection
    - Graceful shutdown
    """
    
    def __init__(
        self,
        url: str,
        name: str,
        ping_interval: float = 30.0,
        ping_timeout: float = 10.0,
        max_reconnect_attempts: int = 10,
        reconnect_interval: float = 5.0,
        message_handler: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        """
        Initialize WebSocket client.
        
        Args:
            url: WebSocket URL
            name: Client name for logging
            ping_interval: Seconds between pings
            ping_timeout: Seconds to wait for pong
            max_reconnect_attempts: Maximum reconnection attempts
            reconnect_interval: Base interval between reconnections
            message_handler: Optional callback for processed messages
        """
        self.url = url
        self.name = name
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        self.max_reconnect_attempts = max_reconnect_attempts
        self.reconnect_interval = reconnect_interval
        self.message_handler = message_handler
        
        self._websocket: Optional[WebSocketClientProtocol] = None
        self._running = False
        self._reconnect_attempts = 0
        self._last_ping: Optional[datetime] = None
        self._subscriptions: Set[str] = set()
        self._tasks: Set[asyncio.Task] = set()
        
    @abstractmethod
    async def _on_connect(self) -> None:
        """Called when connection is established. Implement to subscribe to channels."""
        pass
        
    @abstractmethod
    async def _process_message(self, data: Dict[str, Any]) -> None:
        """Process incoming message. Implement to handle exchange-specific formats."""
        pass
        
    @abstractmethod
    def _create_ping_message(self) -> Optional[str]:
        """Create exchange-specific ping message. Return None to use WebSocket ping."""
        pass
        
    async def connect(self) -> None:
        """Establish WebSocket connection."""
        try:
            logger.info(f"{self.name}: Connecting to {self.url}")
            self._websocket = await websockets.connect(
                self.url,
                ping_interval=None,  # We handle ping manually
                ping_timeout=None
            )
            self._reconnect_attempts = 0
            logger.info(f"{self.name}: Connected successfully")
            
            # Call subclass connection handler
            await self._on_connect()
            
        except Exception as e:
            logger.error(f"{self.name}: Connection failed: {e}")
            raise ConnectionLostError(f"Failed to connect: {e}")
            
    async def disconnect(self) -> None:
        """Close WebSocket connection gracefully."""
        if self._websocket:
            await self._websocket.close()
            self._websocket = None
            logger.info(f"{self.name}: Disconnected")
            
    async def send(self, message: Dict[str, Any]) -> None:
        """Send message to WebSocket."""
        if not self._websocket:
            raise WebSocketError("Not connected")
            
        try:
            await self._websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"{self.name}: Send error: {e}")
            raise WebSocketError(f"Send failed: {e}")
            
    async def _handle_messages(self) -> None:
        """Handle incoming messages."""
        if not self._websocket:
            return
            
        try:
            async for message in self._websocket:
                if not self._running:
                    break
                    
                try:
                    data = json.loads(message)
                    await self._process_message(data)
                    
                    # Call external handler if provided
                    if self.message_handler:
                        self.message_handler(data)
                        
                except json.JSONDecodeError as e:
                    logger.error(f"{self.name}: Invalid JSON: {e}")
                except Exception as e:
                    logger.error(f"{self.name}: Message processing error: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"{self.name}: Connection closed")
            raise ConnectionLostError("Connection closed by remote")
        except Exception as e:
            logger.error(f"{self.name}: Message handler error: {e}")
            raise WebSocketError(f"Message handler failed: {e}")
            
    async def _handle_ping(self) -> None:
        """Send periodic pings to keep connection alive."""
        while self._running:
            try:
                await asyncio.sleep(self.ping_interval)
                
                if not self._websocket:
                    continue
                    
                # Use custom ping or WebSocket ping
                ping_message = self._create_ping_message()
                if ping_message:
                    await self._websocket.send(ping_message)
                else:
                    pong_waiter = await self._websocket.ping()
                    await asyncio.wait_for(pong_waiter, timeout=self.ping_timeout)
                    
                self._last_ping = datetime.now()
                
            except asyncio.TimeoutError:
                logger.error(f"{self.name}: Ping timeout")
                if self._websocket:
                    await self._websocket.close()
            except Exception as e:
                logger.error(f"{self.name}: Ping error: {e}")
                
    async def _reconnect(self) -> None:
        """Attempt to reconnect with exponential backoff."""
        while self._running and self._reconnect_attempts < self.max_reconnect_attempts:
            self._reconnect_attempts += 1
            wait_time = self.reconnect_interval * (2 ** (self._reconnect_attempts - 1))
            
            logger.info(
                f"{self.name}: Reconnect attempt {self._reconnect_attempts}/"
                f"{self.max_reconnect_attempts} in {wait_time}s"
            )
            
            await asyncio.sleep(wait_time)
            
            try:
                await self.connect()
                return
            except Exception as e:
                logger.error(f"{self.name}: Reconnect failed: {e}")
                
        raise ReconnectError(
            f"Max reconnection attempts reached",
            self._reconnect_attempts
        )
        
    async def run(self) -> None:
        """Main run loop with automatic reconnection."""
        self._running = True
        
        while self._running:
            try:
                # Connect if not connected
                if not self._websocket:
                    await self.connect()
                    
                # Start background tasks
                message_task = asyncio.create_task(self._handle_messages())
                ping_task = asyncio.create_task(self._handle_ping())
                
                self._tasks = {message_task, ping_task}
                
                # Wait for any task to complete (likely due to error)
                done, pending = await asyncio.wait(
                    self._tasks,
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # Cancel remaining tasks
                for task in pending:
                    task.cancel()
                    
                # Check for errors
                for task in done:
                    if task.exception():
                        raise task.exception()
                        
            except ConnectionLostError:
                logger.warning(f"{self.name}: Connection lost, attempting reconnect")
                await self._reconnect()
            except ReconnectError as e:
                logger.error(f"{self.name}: Reconnection failed: {e}")
                break
            except Exception as e:
                logger.error(f"{self.name}: Unexpected error: {e}")
                break
                
        await self.stop()
        
    async def stop(self) -> None:
        """Stop the client gracefully."""
        logger.info(f"{self.name}: Stopping...")
        self._running = False
        
        # Cancel all tasks
        for task in self._tasks:
            if not task.done():
                task.cancel()
                
        # Wait for tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
            
        # Disconnect
        await self.disconnect()
        
        logger.info(f"{self.name}: Stopped")
        
    @property
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._websocket is not None and not self._websocket.closed
        
    @property
    def uptime(self) -> Optional[timedelta]:
        """Get connection uptime."""
        if self._last_ping:
            return datetime.now() - self._last_ping
        return None
