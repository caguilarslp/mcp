"""
Base WebSocket collector
"""
import asyncio
import json
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Callable
import websockets
from websockets.client import WebSocketClientProtocol
from src.logger import get_logger
from src.config import WS_RECONNECT_INTERVAL, WS_PING_INTERVAL
from src.models import Trade, Exchange

logger = get_logger(__name__)

class BaseCollector(ABC):
    """Base class for exchange WebSocket collectors"""
    
    def __init__(self, exchange: Exchange, symbols: List[str], on_trade: Callable):
        self.exchange = exchange
        self.symbols = symbols
        self.on_trade = on_trade
        self.ws: Optional[WebSocketClientProtocol] = None
        self.running = False
        self.reconnect_count = 0
        
    @abstractmethod
    def get_ws_url(self) -> str:
        """Get WebSocket URL"""
        pass
    
    @abstractmethod
    def get_subscribe_message(self) -> Dict[str, Any]:
        """Get subscription message"""
        pass
    
    @abstractmethod
    def parse_message(self, message: Dict[str, Any]) -> Optional[List[Trade]]:
        """Parse WebSocket message to trades"""
        pass
    
    async def connect(self):
        """Connect to WebSocket"""
        try:
            self.ws = await websockets.connect(self.get_ws_url())
            logger.info(f"{self.exchange.value}: Connected to WebSocket")
            
            # Subscribe to streams
            await self.ws.send(json.dumps(self.get_subscribe_message()))
            logger.info(f"{self.exchange.value}: Subscribed to {self.symbols}")
            
            self.reconnect_count = 0
            return True
        except Exception as e:
            logger.error(f"{self.exchange.value}: Connection error: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from WebSocket"""
        if self.ws:
            await self.ws.close()
            self.ws = None
    
    async def handle_message(self, message: str):
        """Handle incoming message"""
        try:
            data = json.loads(message)
            trades = self.parse_message(data)
            
            if trades:
                # Send trades to callback
                await self.on_trade(trades)
                
        except json.JSONDecodeError as e:
            logger.error(f"{self.exchange.value}: JSON decode error: {e}")
        except Exception as e:
            logger.error(f"{self.exchange.value}: Message handling error: {e}")
    
    async def run(self):
        """Main run loop"""
        self.running = True
        
        while self.running:
            try:
                if not self.ws or self.ws.closed:
                    if not await self.connect():
                        await asyncio.sleep(WS_RECONNECT_INTERVAL)
                        continue
                
                # Start heartbeat task for Bybit (requires ping every 20s)
                heartbeat_task = None
                if self.exchange == Exchange.BYBIT:
                    heartbeat_task = asyncio.create_task(self._heartbeat_loop())
                
                # Listen for messages
                try:
                    async for message in self.ws:
                        await self.handle_message(message)
                finally:
                    # Cancel heartbeat task when connection ends
                    if heartbeat_task:
                        heartbeat_task.cancel()
                        try:
                            await heartbeat_task
                        except asyncio.CancelledError:
                            pass
                    
            except websockets.exceptions.ConnectionClosed:
                logger.warning(f"{self.exchange.value}: Connection closed")
                self.reconnect_count += 1
                await asyncio.sleep(WS_RECONNECT_INTERVAL)
                
            except Exception as e:
                logger.error(f"{self.exchange.value}: Unexpected error: {e}")
                await asyncio.sleep(WS_RECONNECT_INTERVAL)
    
    async def _heartbeat_loop(self):
        """Send ping every 20 seconds for Bybit (as per documentation)"""
        while self.running and self.ws and not self.ws.closed:
            try:
                await asyncio.sleep(20)  # Bybit docs recommend 20 seconds
                if self.ws and not self.ws.closed:
                    ping_message = {"op": "ping"}
                    await self.ws.send(json.dumps(ping_message))
                    logger.debug(f"{self.exchange.value}: Sent heartbeat ping")
            except Exception as e:
                logger.warning(f"{self.exchange.value}: Heartbeat error: {e}")
                break
    
    async def stop(self):
        """Stop the collector"""
        self.running = False
        await self.disconnect()
        logger.info(f"{self.exchange.value}: Collector stopped")
