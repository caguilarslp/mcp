"""
Bybit Trades Collector

Implementación específica para recopilar trades de Bybit
usando WebSocket v5 API.
"""

import json
from decimal import Decimal
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..base import WebSocketCollector
from ...entities.trade import Trade, TradeSide


class BybitTradesCollector(WebSocketCollector):
    """
    Collector para trades de Bybit usando WebSocket v5 API
    
    WebSocket URL: wss://stream.bybit.com/v5/public/spot
    Topic format: publicTrade.{symbol}
    """
    
    # Bybit WebSocket configuration
    WEBSOCKET_URL = "wss://stream.bybit.com/v5/public/spot"
    EXCHANGE_NAME = "bybit"
    
    def __init__(
        self,
        symbols: List[str],
        storage_handler: Optional[Any] = None,
        **kwargs
    ):
        """
        Initialize Bybit trades collector
        
        Args:
            symbols: List of symbols to collect (e.g., ["BTCUSDT", "ETHUSDT"])
            storage_handler: Handler for storing trades (optional)
            **kwargs: Additional arguments for WebSocketCollector
        """
        # Call parent constructor and pass storage_handler
        super().__init__(
            name=f"bybit_trades",
            websocket_url=self.WEBSOCKET_URL,
            symbols=symbols,
            storage_handler=storage_handler,  # CRITICAL: Pass storage_handler to parent
            **kwargs
        )
        
        # Log initialization details
        self.logger.info(f"Initialized Bybit trades collector for symbols: {symbols}")
        self.logger.info(f"WebSocket URL: {self.websocket_url}")
        self.logger.info(f"Storage handler confirmed: {type(self.storage_handler).__name__ if self.storage_handler else 'None'}")
        self.logger.info(f"Storage handler ID: {id(self.storage_handler) if self.storage_handler else 'None'}")
    
    async def create_subscription_message(self, symbols: List[str]) -> str:
        """
        Create Bybit subscription message for trade topics
        
        Format: {"op": "subscribe", "args": ["publicTrade.BTCUSDT", ...]}
        
        Args:
            symbols: List of symbols to subscribe to
            
        Returns:
            JSON string of subscription message
        """
        topics = [f"publicTrade.{symbol}" for symbol in symbols]
        
        subscription = {
            "op": "subscribe",
            "args": topics
        }
        
        self.logger.debug(f"Creating subscription message: {subscription}")
        return json.dumps(subscription)
    
    async def process_message(self, message: Dict[str, Any]) -> None:
        """
        Process Bybit WebSocket message
        
        Bybit trade message format:
        {
            "topic": "publicTrade.BTCUSDT",
            "type": "snapshot",
            "ts": 1672304486868,
            "data": [
                {
                    "T": 1672304486865,
                    "s": "BTCUSDT", 
                    "S": "Buy",
                    "v": "0.001",
                    "p": "16578.50",
                    "L": "PlusTick",
                    "i": "20f43950-d8dd-486a-b2bc-ef9906ba53c0",
                    "BT": false
                }
            ]
        }
        
        Args:
            message: Parsed JSON message from Bybit WebSocket
        """
        try:
            # Handle subscription confirmation
            if message.get("op") == "subscribe":
                if message.get("success"):
                    self.logger.info(f"Successfully subscribed to: {message.get('ret_msg', 'unknown')}")
                else:
                    self.logger.error(f"Subscription failed: {message.get('ret_msg', 'unknown error')}")
                return
            
            # Handle trade data
            if "topic" in message and "data" in message:
                topic = message["topic"]
                
                # Verify it's a trade topic
                if not topic.startswith("publicTrade."):
                    self.logger.debug(f"Ignoring non-trade topic: {topic}")
                    return
                
                # Extract symbol from topic
                symbol = topic.replace("publicTrade.", "")
                
                # Process each trade in the data array
                trades_data = message["data"]
                if not isinstance(trades_data, list):
                    self.logger.warning(f"Expected list of trades, got: {type(trades_data)}")
                    return
                
                for trade_data in trades_data:
                    await self._process_trade_data(symbol, trade_data, message)
            
            else:
                # Handle other message types (pings, etc.)
                self.logger.debug(f"Received non-trade message: {message}")
        
        except Exception as e:
            self.logger.error(f"Error processing Bybit message: {e}")
            self.logger.debug(f"Problematic message: {message}")
            await self.on_error(e)
    
    async def _process_trade_data(
        self, 
        symbol: str, 
        trade_data: Dict[str, Any], 
        original_message: Dict[str, Any]
    ) -> None:
        """
        Process individual trade data from Bybit
        
        Args:
            symbol: Trading symbol
            trade_data: Individual trade data
            original_message: Original WebSocket message for context
        """
        try:
            self.logger.debug(f"Processing trade data for {symbol}: {trade_data}")
            
            # Parse trade data
            trade = self._parse_bybit_trade(symbol, trade_data, original_message)
            self.logger.debug(f"Parsed trade object: {trade}")
            
            # DIRECT FIX: Use global storage
            from ..storage import GLOBAL_STORAGE
            await GLOBAL_STORAGE.store_trade(trade)
            # Log first few trades at INFO level for verification
            if self._stats.get("messages_processed", 0) < 5:
                self.logger.info(f"Successfully stored trade: {trade.symbol} {trade.side} {str(trade.price)} x {str(trade.quantity)}")
            else:
                self.logger.debug(f"Stored trade: {trade.symbol} {trade.side} {str(trade.price)} x {str(trade.quantity)}")
            
        except Exception as e:
            self.logger.error(f"Error processing trade data: {e}", exc_info=True)
            self.logger.error(f"Problematic trade data: {trade_data}")
    
    def _parse_bybit_trade(
        self, 
        symbol: str, 
        trade_data: Dict[str, Any], 
        original_message: Dict[str, Any]
    ) -> Trade:
        """
        Parse Bybit trade data into Trade entity
        
        Args:
            symbol: Trading symbol
            trade_data: Bybit trade data
            original_message: Original message for raw_data
            
        Returns:
            Trade entity
        """
        # Extract required fields
        price = Decimal(str(trade_data["p"]))
        quantity = Decimal(str(trade_data["v"]))
        
        # Parse side
        side_str = trade_data["S"]
        if side_str == "Buy":
            side = TradeSide.BUY
        elif side_str == "Sell":
            side = TradeSide.SELL
        else:
            raise ValueError(f"Unknown trade side: {side_str}")
        
        # Parse timestamp (Bybit uses milliseconds)
        timestamp_ms = trade_data["T"]
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000.0)
        
        # Get trade ID
        trade_id = trade_data.get("i", f"{timestamp_ms}_{symbol}")
        
        # Create Trade entity
        trade = Trade(
            symbol=symbol,
            side=side,
            price=price,
            quantity=quantity,
            timestamp=timestamp,
            exchange=self.EXCHANGE_NAME,
            trade_id=trade_id,
            raw_data={
                "bybit_trade": trade_data,
                "message_metadata": {
                    "topic": original_message.get("topic"),
                    "type": original_message.get("type"),
                    "ts": original_message.get("ts")
                }
            }
        )
        
        return trade
    
    async def on_connected(self) -> None:
        """Called when WebSocket connection is established"""
        await super().on_connected()
        self.logger.info(f"Connected to Bybit WebSocket API v5")
    
    async def on_subscribed(self, symbols: List[str]) -> None:
        """Called when symbols are successfully subscribed"""
        await super().on_subscribed(symbols)
        topics = [f"publicTrade.{symbol}" for symbol in symbols]
        self.logger.info(f"Subscribed to Bybit trade topics: {topics}")
