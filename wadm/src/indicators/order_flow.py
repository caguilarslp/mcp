"""
Order Flow indicator calculator
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from src.models import OrderFlow, Exchange
from src.logger import get_logger

logger = get_logger(__name__)

class OrderFlowCalculator:
    """Calculate Order Flow metrics from trades"""
    
    def __init__(self):
        # Store cumulative delta per symbol
        self.cumulative_deltas: Dict[str, float] = {}
        # Large trade threshold (in USD equivalent)
        self.large_trade_threshold = 10000
    
    def calculate(self, trades: List[Dict[str, Any]], symbol: str, exchange: str,
                 previous_flow: Optional[Dict[str, Any]] = None) -> OrderFlow:
        """
        Calculate order flow metrics from trades
        """
        if not trades:
            raise ValueError("No trades provided")
        
        # Calculate volumes by side
        buy_volume = sum(t["quantity"] for t in trades if t["side"] == "buy")
        sell_volume = sum(t["quantity"] for t in trades if t["side"] == "sell")
        
        # Calculate delta
        delta = buy_volume - sell_volume
        
        # Get cumulative delta
        key = f"{exchange}:{symbol}"
        if previous_flow and "cumulative_delta" in previous_flow:
            cumulative_delta = previous_flow["cumulative_delta"] + delta
        else:
            cumulative_delta = self.cumulative_deltas.get(key, 0) + delta
        
        self.cumulative_deltas[key] = cumulative_delta
        
        # Calculate imbalance ratio
        if sell_volume > 0:
            imbalance_ratio = buy_volume / sell_volume
        else:
            imbalance_ratio = float('inf') if buy_volume > 0 else 1.0
        
        # Count large trades
        large_trades_count = 0
        for trade in trades:
            trade_value = trade["price"] * trade["quantity"]
            if trade_value >= self.large_trade_threshold:
                large_trades_count += 1
        
        # Detect absorption (high volume with small price movement)
        absorption_detected = self._detect_absorption(trades, buy_volume, sell_volume)
        
        return OrderFlow(
            symbol=symbol,
            exchange=Exchange(exchange),
            timestamp=datetime.now(timezone.utc),
            buy_volume=buy_volume,
            sell_volume=sell_volume,
            delta=delta,
            cumulative_delta=cumulative_delta,
            imbalance_ratio=imbalance_ratio,
            large_trades_count=large_trades_count,
            absorption_detected=absorption_detected
        )
    
    def _detect_absorption(self, trades: List[Dict[str, Any]], 
                          buy_volume: float, sell_volume: float) -> bool:
        """
        Detect absorption pattern:
        - High volume but small price movement
        - Strong imbalance but price doesn't follow
        """
        if len(trades) < 10:
            return False
        
        # Calculate price movement
        prices = [t["price"] for t in trades]
        price_range = max(prices) - min(prices)
        avg_price = sum(prices) / len(prices)
        price_movement_pct = (price_range / avg_price) * 100
        
        # Calculate volume intensity
        total_volume = buy_volume + sell_volume
        avg_trade_size = total_volume / len(trades)
        
        # High volume with small price movement indicates absorption
        if total_volume > avg_trade_size * 50 and price_movement_pct < 0.1:
            return True
        
        # Strong imbalance but price stable
        imbalance = abs(buy_volume - sell_volume) / total_volume
        if imbalance > 0.7 and price_movement_pct < 0.05:
            return True
        
        return False
    
    def reset_cumulative_delta(self, symbol: str, exchange: str):
        """Reset cumulative delta for a symbol"""
        key = f"{exchange}:{symbol}"
        self.cumulative_deltas[key] = 0
