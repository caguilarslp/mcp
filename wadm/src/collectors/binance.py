"""
Binance WebSocket collector
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import websockets
from src.collectors.base import BaseCollector
from src.models import Trade, Exchange, Side
from src.config import BINANCE_WS_URL
from src.logger import get_logger

logger = get_logger(__name__)

class BinanceCollector(BaseCollector):
    """Binance WebSocket collector for trades"""
    
    def __init__(self, symbols: List[str], on_trade):
        super().__init__(Exchange.BINANCE, symbols, on_trade)
        # Binance uses lowercase symbols
        self.symbols = [s.lower() for s in symbols]
    
    def get_ws_url(self) -> str:
        # Binance uses single connection with subscribe message
        return BINANCE_WS_URL
    
    def get_subscribe_message(self) -> Dict[str, Any]:
        """Subscribe to aggTrade streams for all symbols"""
        streams = [f"{symbol}@aggTrade" for symbol in self.symbols]
        return {
            "method": "SUBSCRIBE",
            "params": streams,
            "id": 1
        }
    
    # Use default connect method from base class
    
    def parse_message(self, message: Dict[str, Any]) -> Optional[List[Trade]]:
        """Parse Binance trade message"""
        # Handle subscription response
        if "result" in message and message.get("id") == 1:
            return None
            
        if "stream" not in message or "data" not in message:
            return None
        
        data = message["data"]
        if data.get("e") != "aggTrade":
            return None
        
        try:
            trade = Trade(
                exchange=Exchange.BINANCE,
                symbol=data["s"],  # Already uppercase from Binance
                price=float(data["p"]),
                quantity=float(data["q"]),
                side=Side.BUY if data["m"] else Side.SELL,  # m=true means seller is maker
                timestamp=datetime.fromtimestamp(data["T"] / 1000, tz=timezone.utc),
                trade_id=str(data["a"])  # Binance uses 'a' for aggregated trade ID
            )
            return [trade]
        except Exception as e:
            logger.error(f"Error parsing Binance trade: {e}, data: {data}")
            return None
