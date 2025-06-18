"""
Bybit WebSocket collector
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
import websockets
from src.collectors.base import BaseCollector
from src.models import Trade, Exchange, Side
from src.config import BYBIT_WS_URL
from src.logger import get_logger

logger = get_logger(__name__)

class BybitCollector(BaseCollector):
    """Bybit WebSocket collector for trades"""
    
    def __init__(self, symbols: List[str], on_trade):
        super().__init__(Exchange.BYBIT, symbols, on_trade)
    
    def get_ws_url(self) -> str:
        return BYBIT_WS_URL
    
    def get_subscribe_message(self) -> Dict[str, Any]:
        """Subscribe to trade streams for all symbols"""
        topics = [f"publicTrade.{symbol}" for symbol in self.symbols]
        return {
            "op": "subscribe",
            "args": topics
        }
    
    def parse_message(self, message: Dict[str, Any]) -> Optional[List[Trade]]:
        """Parse Bybit trade message"""
        if "topic" not in message or "data" not in message:
            return None
        
        topic = message["topic"]
        if not topic.startswith("publicTrade."):
            return None
        
        symbol = topic.replace("publicTrade.", "")
        trades = []
        
        for trade_data in message["data"]:
            try:
                trade = Trade(
                    exchange=Exchange.BYBIT,
                    symbol=symbol,
                    price=float(trade_data["p"]),
                    quantity=float(trade_data["v"]),
                    side=Side.BUY if trade_data["S"] == "Buy" else Side.SELL,
                    timestamp=datetime.fromtimestamp(int(trade_data["T"]) / 1000),
                    trade_id=trade_data["i"]
                )
                trades.append(trade)
            except Exception as e:
                logger.error(f"Error parsing Bybit trade: {e}, data: {trade_data}")
        
        return trades if trades else None
