"""
Kraken WebSocket Collector  
Real-time trade data from Kraken (institutional EU exchange)
"""
import asyncio
import json
import websockets
from datetime import datetime, timezone
from typing import List, Callable, Dict, Any
from src.models import Trade, Exchange, Side
from src.logger import get_logger

logger = get_logger(__name__)

class KrakenCollector:
    """Collect real-time trades from Kraken"""
    
    def __init__(self, symbols: List[str], callback: Callable):
        self.symbols = self._format_symbols(symbols)
        self.callback = callback
        self.ws_url = "wss://ws.kraken.com"
        self.ws = None
        self.running = False
        
        # Kraken specific settings
        self.reconnect_interval = 5
        self.ping_interval = 30
        
        # Channel mapping for subscriptions
        self.subscription_id = None
        
        logger.info(f"Kraken collector initialized for {self.symbols}")
    
    def _format_symbols(self, symbols: List[str]) -> List[str]:
        """Convert symbols to Kraken format"""
        # Convert BTCUSDT -> XBT/USD, etc.
        formatted = []
        for symbol in symbols:
            if symbol == "BTCUSDT":
                formatted.append("XBT/USD")  # Kraken uses XBT for Bitcoin
            elif symbol == "ETHUSDT":
                formatted.append("ETH/USD")
            elif symbol == "XRPUSDT":
                formatted.append("XRP/USD")
            elif symbol == "HBARUSDT":
                # Kraken might not have HBAR
                logger.warning(f"Symbol {symbol} may not be available on Kraken")
                continue
            else:
                # Generic conversion
                base = symbol.replace("USDT", "")
                formatted.append(f"{base}/USD")
        
        return formatted
    
    async def _connect(self):
        """Connect to Kraken WebSocket"""
        try:
            logger.info("Connecting to Kraken WebSocket...")
            
            self.ws = await websockets.connect(
                self.ws_url,
                ping_interval=self.ping_interval,
                ping_timeout=10
            )
            
            # Subscribe to trade channel
            subscribe_msg = {
                "event": "subscribe",
                "pair": self.symbols,
                "subscription": {
                    "name": "trade"
                }
            }
            
            await self.ws.send(json.dumps(subscribe_msg))
            logger.info(f"Subscribed to Kraken trades for: {self.symbols}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Kraken: {e}")
            return False
    
    async def _handle_message(self, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            
            # Handle subscription confirmation
            if isinstance(data, dict) and data.get("event") == "subscriptionStatus":
                if data.get("status") == "subscribed":
                    logger.info(f"Kraken subscription confirmed: {data.get('pair')}")
                return
            
            # Handle trade data (comes as array)
            if isinstance(data, list) and len(data) >= 4:
                # Kraken trade format: [channelID, trade_data, channel_name, pair]
                channel_id, trade_data, channel_name, pair = data[0], data[1], data[2], data[3]
                
                if channel_name == "trade":
                    trades = self._parse_trades(trade_data, pair)
                    if trades:
                        await self.callback(trades)
                        
        except Exception as e:
            logger.error(f"Error handling Kraken message: {e}")
    
    def _parse_trades(self, trade_data: List, pair: str) -> List[Trade]:
        """Parse Kraken trade data"""
        trades = []
        
        try:
            # Convert pair back to our format
            symbol = self._convert_symbol_back(pair)
            
            # Kraken trade data format:
            # [
            #   ["price", "volume", "time", "side", "orderType", "misc"],
            #   ...
            # ]
            
            for trade_info in trade_data:
                if len(trade_info) >= 4:
                    price = float(trade_info[0])
                    volume = float(trade_info[1])
                    timestamp = float(trade_info[2])
                    side = Side.BUY if trade_info[3] == "b" else Side.SELL
                    
                    trade = Trade(
                        symbol=symbol,
                        exchange=Exchange.KRAKEN,
                        trade_id=f"{pair}_{timestamp}_{price}",  # Generate unique ID
                        price=price,
                        quantity=volume,
                        side=side,
                        timestamp=datetime.fromtimestamp(timestamp, tz=timezone.utc)
                    )
                    
                    trades.append(trade)
            
        except Exception as e:
            logger.error(f"Error parsing Kraken trades: {e}")
        
        return trades
    
    def _convert_symbol_back(self, pair: str) -> str:
        """Convert Kraken pair back to our symbol format"""
        # XBT/USD -> BTCUSDT
        if pair == "XBT/USD":
            return "BTCUSDT"
        elif pair == "ETH/USD":
            return "ETHUSDT"
        elif pair == "XRP/USD":
            return "XRPUSDT"
        else:
            # Generic: ETH/USD -> ETHUSDT
            base = pair.replace("/USD", "").replace("XBT", "BTC")
            return f"{base}USDT"
    
    async def _listen(self):
        """Listen for messages"""
        try:
            async for message in self.ws:
                if not self.running:
                    break
                await self._handle_message(message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Kraken WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error in Kraken listener: {e}")
    
    async def run(self):
        """Main run loop with reconnection"""
        self.running = True
        
        while self.running:
            try:
                if await self._connect():
                    logger.info("Kraken collector started")
                    await self._listen()
                
                if self.running:
                    logger.info(f"Reconnecting to Kraken in {self.reconnect_interval}s...")
                    await asyncio.sleep(self.reconnect_interval)
                    
            except Exception as e:
                logger.error(f"Error in Kraken run loop: {e}")
                if self.running:
                    await asyncio.sleep(self.reconnect_interval)
    
    async def stop(self):
        """Stop the collector"""
        logger.info("Stopping Kraken collector...")
        self.running = False
        
        if self.ws:
            await self.ws.close()
        
        logger.info("Kraken collector stopped")
