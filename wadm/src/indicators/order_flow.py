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
        Enhanced with momentum scoring and exhaustion detection
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
        total_volume = buy_volume + sell_volume
        if total_volume > 0:
            imbalance_ratio = buy_volume / total_volume  # Normalized 0-1
        else:
            imbalance_ratio = 0.5
        
        # Count large trades and institutional activity
        large_trades_count = 0
        institutional_volume = 0
        for trade in trades:
            trade_value = trade["price"] * trade["quantity"]
            if trade_value >= self.large_trade_threshold:
                large_trades_count += 1
                institutional_volume += trade["quantity"]
        
        # Calculate momentum score (0-100)
        momentum_score = self._calculate_momentum_score(
            trades, delta, imbalance_ratio, large_trades_count
        )
        
        # Detect absorption events
        absorption_events = self._detect_absorption_events(trades)
        
        # Calculate VWAP delta
        vwap_delta = self._calculate_vwap_delta(trades)
        
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
            absorption_detected=bool(absorption_events),
            momentum_score=momentum_score,
            institutional_volume=institutional_volume,
            vwap_delta=vwap_delta,
            absorption_events=absorption_events
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
    
    def _calculate_momentum_score(self, trades: List[Dict[str, Any]], 
                                delta: float, imbalance_ratio: float, 
                                large_trades_count: int) -> float:
        """
        Calculate momentum score (0-100) based on multiple factors
        """
        if not trades:
            return 50.0
        
        score = 50.0  # Neutral
        
        # Delta contribution (40%)
        total_volume = sum(t["quantity"] for t in trades)
        if total_volume > 0:
            delta_ratio = abs(delta) / total_volume
            delta_score = min(delta_ratio * 100, 40)
            score += delta_score if delta > 0 else -delta_score
        
        # Imbalance contribution (30%)
        if imbalance_ratio > 0.6:  # Strong buy pressure
            score += (imbalance_ratio - 0.5) * 60
        elif imbalance_ratio < 0.4:  # Strong sell pressure
            score += (imbalance_ratio - 0.5) * 60
        
        # Large trades contribution (20%)
        if large_trades_count > 0:
            large_trade_ratio = large_trades_count / len(trades)
            score += large_trade_ratio * 20
        
        # Velocity contribution (10%)
        time_span = trades[-1]["timestamp"] - trades[0]["timestamp"]
        if time_span > 0:
            velocity = len(trades) / time_span.total_seconds()
            velocity_score = min(velocity * 10, 10)
            score += velocity_score
        
        return max(0, min(100, score))
    
    def _detect_absorption_events(self, trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect specific absorption events with details
        """
        events = []
        if len(trades) < 20:
            return events
        
        # Group trades by time windows
        window_size = 60  # 1 minute windows
        current_window = []
        current_time = trades[0]["timestamp"]
        
        for trade in trades:
            if (trade["timestamp"] - current_time).total_seconds() <= window_size:
                current_window.append(trade)
            else:
                # Analyze completed window
                if len(current_window) >= 10:
                    event = self._analyze_window_for_absorption(current_window)
                    if event:
                        events.append(event)
                
                current_window = [trade]
                current_time = trade["timestamp"]
        
        # Analyze last window
        if len(current_window) >= 10:
            event = self._analyze_window_for_absorption(current_window)
            if event:
                events.append(event)
        
        return events
    
    def _analyze_window_for_absorption(self, window_trades: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Analyze a time window for absorption patterns
        """
        if len(window_trades) < 10:
            return None
        
        # Calculate metrics for this window
        prices = [t["price"] for t in window_trades]
        volumes = [t["quantity"] for t in window_trades]
        
        price_range = max(prices) - min(prices)
        avg_price = sum(prices) / len(prices)
        total_volume = sum(volumes)
        avg_volume = total_volume / len(window_trades)
        
        # Buy/sell volumes
        buy_vol = sum(t["quantity"] for t in window_trades if t["side"] == "buy")
        sell_vol = sum(t["quantity"] for t in window_trades if t["side"] == "sell")
        
        # Check for absorption patterns
        price_movement_pct = (price_range / avg_price) * 100 if avg_price > 0 else 0
        volume_intensity = total_volume / max(1, len(window_trades))
        imbalance = abs(buy_vol - sell_vol) / max(1, total_volume)
        
        # High volume, low price movement = absorption
        if (volume_intensity > avg_volume * 2.5 and 
            price_movement_pct < 0.15 and 
            imbalance > 0.6):
            
            return {
                "timestamp": window_trades[0]["timestamp"],
                "type": "volume_absorption",
                "price_level": avg_price,
                "volume": total_volume,
                "imbalance": imbalance,
                "dominant_side": "buy" if buy_vol > sell_vol else "sell",
                "strength": min(100, (volume_intensity / avg_volume) * 20)
            }
        
        return None
    
    def _calculate_vwap_delta(self, trades: List[Dict[str, Any]]) -> float:
        """
        Calculate volume-weighted delta
        """
        if not trades:
            return 0.0
        
        # Calculate VWAP
        total_value = sum(t["price"] * t["quantity"] for t in trades)
        total_volume = sum(t["quantity"] for t in trades)
        vwap = total_value / total_volume if total_volume > 0 else 0
        
        # Calculate delta above/below VWAP
        above_vwap_delta = 0
        below_vwap_delta = 0
        
        for trade in trades:
            delta_contribution = trade["quantity"] if trade["side"] == "buy" else -trade["quantity"]
            
            if trade["price"] >= vwap:
                above_vwap_delta += delta_contribution
            else:
                below_vwap_delta += delta_contribution
        
        return above_vwap_delta - below_vwap_delta
    
    def reset_cumulative_delta(self, symbol: str, exchange: str):
        """Reset cumulative delta for a symbol"""
        key = f"{exchange}:{symbol}"
        self.cumulative_deltas[key] = 0
