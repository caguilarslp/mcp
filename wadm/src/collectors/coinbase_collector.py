"""
Coinbase Pro WebSocket Collector
Real-time trade data from Coinbase Pro (institutional US exchange)
"""
import asyncio
import json
import websockets
from datetime import datetime, timezone
from typing import List, Callable, Dict, Any
from src.models import Trade, Exchange, Side
from src.logger import get_logger

logger = get_logger(__name__)

class CoinbaseCollector:
    """Collect real-time trades from Coinbase Pro"""
    
    def __init__(self, symbols: List[str], callback: Callable):
        self.symbols = self._format_symbols(symbols)
        self.callback = callback
        self.ws_url = "wss://ws-feed.exchange.coinbase.com"
        self.ws = None
        self.running = False
        
        # Coinbase Pro specific settings
        self.reconnect_interval = 5
        self.ping_interval = 30
        
        logger.info(f"Coinbase Pro collector initialized for {self.symbols}")
    
    def _format_symbols(self, symbols: List[str]) -> List[str]:
        """Convert symbols to Coinbase Pro format"""
        # Convert BTCUSDT -> BTC-USD, etc.
        formatted = []
        for symbol in symbols:
            if symbol == "BTCUSDT":
                formatted.append("BTC-USD")
            elif symbol == "ETHUSDT":
                formatted.append("ETH-USD")
            elif symbol == "XRPUSDT":
                formatted.append("XRP-USD")
            elif symbol == "HBARUSDT":
                # Coinbase Pro might not have HBAR, skip or use alternative
                logger.warning(f"Symbol {symbol} may not be available on Coinbase Pro")
                continue
            else:
                # Generic conversion: remove USDT, add -USD
                base = symbol.replace("USDT", "")
                formatted.append(f"{base}-USD")
        
        return formatted
    
    async def _connect(self):
        """Connect to Coinbase Pro WebSocket"""
        try:
            logger.info("Connecting to Coinbase Pro WebSocket...")
            
            # Subscription message for matches (trades)
            subscribe_msg = {
                "type": "subscribe",
                "product_ids": self.symbols,
                "channels": ["matches"]
            }
            
            self.ws = await websockets.connect(
                self.ws_url,
                ping_interval=self.ping_interval,
                ping_timeout=10
            )
            
            # Send subscription
            await self.ws.send(json.dumps(subscribe_msg))
            logger.info(f"Subscribed to Coinbase Pro matches for: {self.symbols}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Coinbase Pro: {e}")
            return False
    
    async def _handle_message(self, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            
            # Handle trade matches
            if data.get("type") == "match":
                trade = self._parse_trade(data)
                if trade:
                    await self.callback([trade])
                    
        except Exception as e:
            logger.error(f"Error handling Coinbase Pro message: {e}")
    
    def _parse_trade(self, data: Dict[str, Any]) -> Trade:
        """Parse Coinbase Pro trade data"""
        try:
            # Coinbase Pro match message format:
            # {
            #   "type": "match",
            #   "trade_id": 12345,
            #   "product_id": "BTC-USD", 
            #   "size": "0.01",
            #   "price": "50000.00",
            #   "side": "buy",  # taker side
            #   "time": "2023-01-01T12:00:00.000000Z"
            # }
            
            # Convert product_id back to our format
            symbol = self._convert_symbol_back(data["product_id"])
            
            trade = Trade(
                symbol=symbol,
                exchange=Exchange.COINBASE,
                trade_id=str(data["trade_id"]),
                price=float(data["price"]),
                quantity=float(data["size"]),
                side=Side.BUY if data["side"] == "buy" else Side.SELL,
                timestamp=datetime.fromisoformat(
                    data["time"].replace("Z", "+00:00")
                )
            )
            
            return trade
            
        except Exception as e:
            logger.error(f"Error parsing Coinbase Pro trade: {e}")
            return None
    
    def _convert_symbol_back(self, product_id: str) -> str:
        """Convert Coinbase Pro product_id back to our symbol format"""
        # BTC-USD -> BTCUSDT
        if product_id == "BTC-USD":
            return "BTCUSDT"
        elif product_id == "ETH-USD":
            return "ETHUSDT"
        elif product_id == "XRP-USD":
            return "XRPUSDT"
        else:
            # Generic: BTC-USD -> BTCUSDT
            base = product_id.replace("-USD", "")
            return f"{base}USDT"
    
    async def _listen(self):
        """Listen for messages"""
        try:
            async for message in self.ws:
                if not self.running:
                    break
                await self._handle_message(message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Coinbase Pro WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error in Coinbase Pro listener: {e}")
    
    async def run(self):
        """Main run loop with reconnection"""
        self.running = True
        
        while self.running:
            try:
                if await self._connect():
                    logger.info("Coinbase Pro collector started")
                    await self._listen()
                
                if self.running:
                    logger.info(f"Reconnecting to Coinbase Pro in {self.reconnect_interval}s...")
                    await asyncio.sleep(self.reconnect_interval)
                    
            except Exception as e:
                logger.error(f"Error in Coinbase Pro run loop: {e}")
                if self.running:
                    await asyncio.sleep(self.reconnect_interval)
    
    async def stop(self):
        """Stop the collector"""
        logger.info("Stopping Coinbase Pro collector...")
        self.running = False
        
        if self.ws:
            await self.ws.close()
        
        logger.info("Coinbase Pro collector stopped")
