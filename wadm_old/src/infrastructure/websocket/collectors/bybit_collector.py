"""Bybit v5 WebSocket collector for trades data."""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from ..base import BaseWebSocketClient
from ....core.domain.entities import Trade
from ....infrastructure.repositories.mongodb_repository import MongoDBRepository

logger = logging.getLogger(__name__)


class BybitCollector(BaseWebSocketClient):
    """
    Bybit v5 WebSocket collector for real-time trades.
    
    Features:
    - Connects to Bybit v5 public trade stream
    - Parses trade data into domain entities
    - Stores trades in MongoDB
    - Handles Bybit-specific ping/pong
    """
    
    # Bybit v5 WebSocket endpoints
    SPOT_URL = "wss://stream.bybit.com/v5/public/spot"
    LINEAR_URL = "wss://stream.bybit.com/v5/public/linear"
    
    def __init__(
        self,
        symbol: str,
        market_type: str = "linear",
        repository: Optional[MongoDBRepository] = None,
        **kwargs
    ):
        """
        Initialize Bybit collector.
        
        Args:
            symbol: Trading symbol (e.g., "BTCUSDT")
            market_type: Market type ("spot" or "linear")
            repository: MongoDB repository for storing trades
            **kwargs: Additional arguments for base client
        """
        # Select appropriate endpoint
        url = self.SPOT_URL if market_type == "spot" else self.LINEAR_URL
        
        super().__init__(
            url=url,
            name=f"BybitCollector-{symbol}",
            ping_interval=20.0,  # Bybit recommends 20s
            **kwargs
        )
        
        self.symbol = symbol
        self.market_type = market_type
        self.repository = repository
        self._trade_count = 0
        self._last_trade_time: Optional[datetime] = None
        
    async def _on_connect(self) -> None:
        """Subscribe to trade stream after connection."""
        subscribe_msg = {
            "op": "subscribe",
            "args": [f"publicTrade.{self.symbol}"]
        }
        
        await self.send(subscribe_msg)
        logger.info(f"{self.name}: Subscribed to {self.symbol} trades")
        
    async def _process_message(self, data: Dict[str, Any]) -> None:
        """
        Process Bybit WebSocket message.
        
        Message format:
        {
            "topic": "publicTrade.BTCUSDT",
            "type": "snapshot",
            "ts": 1672304486868,
            "data": [
                {
                    "T": 1672304486865,  // Trade time
                    "s": "BTCUSDT",      // Symbol
                    "S": "Buy",          // Side
                    "v": "0.001",        // Size
                    "p": "16578.50",     // Price
                    "L": "PlusTick",     // Tick direction
                    "i": "2290000000022420137",  // Trade ID
                    "BT": false          // Is block trade
                }
            ]
        }
        """
        # Handle subscription response
        if data.get("success") is not None:
            if data["success"]:
                logger.info(f"{self.name}: Subscription confirmed")
            else:
                logger.error(f"{self.name}: Subscription failed: {data.get('ret_msg')}")
            return
            
        # Handle pong response
        if data.get("op") == "pong":
            logger.debug(f"{self.name}: Received pong")
            return
            
        # Handle trade data
        if "topic" in data and data["topic"].startswith("publicTrade"):
            await self._process_trades(data)
            
    async def _process_trades(self, data: Dict[str, Any]) -> None:
        """Process trade data from Bybit."""
        trades_data = data.get("data", [])
        
        if not trades_data:
            return
            
        trades: List[Trade] = []
        
        for trade_data in trades_data:
            try:
                # Parse trade
                trade = self._parse_trade(trade_data)
                trades.append(trade)
                
                # Update statistics
                self._trade_count += 1
                self._last_trade_time = trade.timestamp
                
            except Exception as e:
                logger.error(f"{self.name}: Failed to parse trade: {e}, data: {trade_data}")
                
        # Store trades if repository is available
        if self.repository and trades:
            try:
                await self.repository.save_trades(trades)
                logger.debug(f"{self.name}: Stored {len(trades)} trades")
            except Exception as e:
                logger.error(f"{self.name}: Failed to store trades: {e}")
                
    def _parse_trade(self, data: Dict[str, Any]) -> Trade:
        """Parse Bybit trade data into Trade entity."""
        # Bybit uses millisecond timestamps
        timestamp = datetime.fromtimestamp(data["T"] / 1000)
        
        # Determine if buy or sell (from taker perspective)
        is_buy = data["S"] == "Buy"
        
        return Trade(
            exchange="bybit",
            symbol=data["s"],
            price=float(data["p"]),
            size=float(data["v"]),
            side="buy" if is_buy else "sell",
            timestamp=timestamp,
            trade_id=data["i"]
        )
        
    def _create_ping_message(self) -> Optional[str]:
        """Create Bybit-specific ping message."""
        # Bybit uses JSON ping
        return '{"op":"ping"}'
        
    def get_stats(self) -> Dict[str, Any]:
        """Get collector statistics."""
        return {
            "name": self.name,
            "symbol": self.symbol,
            "market_type": self.market_type,
            "connected": self.is_connected,
            "trade_count": self._trade_count,
            "last_trade_time": self._last_trade_time.isoformat() if self._last_trade_time else None,
            "uptime_seconds": self.uptime.total_seconds() if self.uptime else 0
        }
