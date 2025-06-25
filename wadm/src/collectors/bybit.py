"""
Bybit WebSocket collector
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import websockets
from src.collectors.base import BaseCollector
from src.models import Trade, Exchange, Side
from src.config import BYBIT_WS_URL
from src.logger import get_logger
import json
import asyncio

logger = get_logger(__name__)

class BybitCollector(BaseCollector):
    """Bybit WebSocket collector for trades"""
    
    def __init__(self, symbols: List[str], on_trade):
        super().__init__(Exchange.BYBIT, symbols, on_trade)
        self.debug_message_count = 0
        self.remaining_chunks = []
        self.subscribed_chunks = 0
        logger.info(f"Bybit collector initialized with symbols: {symbols}")
    
    def get_ws_url(self) -> str:
        return BYBIT_WS_URL
    
    def get_subscribe_message(self) -> Dict[str, Any]:
        """Subscribe to trade streams for all symbols - Bybit limits to 10 symbols per subscription"""
        # Split symbols into chunks of 10 (Bybit's limit)
        symbol_chunks = [self.symbols[i:i+10] for i in range(0, len(self.symbols), 10)]
        
        # Return first chunk - will need multiple subscriptions for more symbols
        first_chunk = symbol_chunks[0]
        topics = [f"publicTrade.{symbol}" for symbol in first_chunk]
        message = {
            "op": "subscribe",
            "args": topics
        }
        logger.info(f"Bybit subscription message (chunk 1/{len(symbol_chunks)}): {message}")
        
        # Store remaining chunks for later subscription
        if len(symbol_chunks) > 1:
            self.remaining_chunks = symbol_chunks[1:]
            logger.info(f"Bybit will subscribe to {len(symbol_chunks)-1} additional chunks after first subscription")
        else:
            self.remaining_chunks = []
            
        return message
    
    async def subscribe_remaining_chunks(self):
        """Subscribe to remaining symbol chunks (beyond the first 10)"""
        if not self.remaining_chunks:
            return
            
        for i, chunk in enumerate(self.remaining_chunks):
            try:
                topics = [f"publicTrade.{symbol}" for symbol in chunk]
                message = {
                    "op": "subscribe",
                    "args": topics
                }
                await self.ws.send(json.dumps(message))
                logger.info(f"Bybit subscribed to chunk {i+2}: {topics}")
                # Small delay between subscriptions
                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Error subscribing to Bybit chunk {i+2}: {e}")
    
    def parse_message(self, message: Dict[str, Any]) -> Optional[List[Trade]]:
        """Parse Bybit trade message with extensive debugging"""
        
        # Debug: Log every message for investigation
        self.debug_message_count += 1
        if self.debug_message_count <= 10:  # Log first 10 messages
            logger.info(f"Bybit message #{self.debug_message_count}: {message}")
        elif self.debug_message_count == 11:
            logger.info("Bybit: Stopping detailed message logging after 10 messages")
        
        # Handle subscription confirmation
        if message.get("op") == "subscribe":
            if message.get("success"):
                self.subscribed_chunks += 1
                logger.info(f"Bybit subscription confirmed (chunk {self.subscribed_chunks}): {message}")
                
                # Subscribe to remaining chunks after first success
                if self.subscribed_chunks == 1 and self.remaining_chunks:
                    asyncio.create_task(self.subscribe_remaining_chunks())
            else:
                logger.error(f"Bybit subscription failed: {message}")
            return None
        
        # Handle ping/pong
        if message.get("op") == "pong":
            logger.debug(f"Bybit pong received: {message}")
            return None
        
        # Handle trade data
        if "topic" not in message or "data" not in message:
            # Log unrecognized message structure
            if "ret_msg" in message or "success" in message:
                logger.debug(f"Bybit system message: {message}")
            else:
                logger.warning(f"Bybit unknown message structure: {message}")
            return None
        
        topic = message["topic"]
        if not topic.startswith("publicTrade."):
            logger.warning(f"Bybit unexpected topic: {topic}")
            return None
        
        symbol = topic.replace("publicTrade.", "")
        trades = []
        
        # Debug: Log trade data structure
        logger.info(f"Bybit processing {len(message['data'])} trades for {symbol}")
        
        for trade_data in message["data"]:
            try:
                trade = Trade(
                    exchange=Exchange.BYBIT,
                    symbol=symbol,
                    price=float(trade_data["p"]),
                    quantity=float(trade_data["v"]),
                    side=Side.BUY if trade_data["S"] == "Buy" else Side.SELL,
                    timestamp=datetime.fromtimestamp(int(trade_data["T"]) / 1000, tz=timezone.utc),
                    trade_id=trade_data["i"]
                )
                trades.append(trade)
                logger.debug(f"Bybit trade parsed: {symbol} {trade_data['S']} {trade_data['v']}@{trade_data['p']}")
            except Exception as e:
                logger.error(f"Error parsing Bybit trade: {e}, data: {trade_data}")
        
        if trades:
            logger.info(f"Bybit returning {len(trades)} trades for {symbol}")
        
        return trades if trades else None
