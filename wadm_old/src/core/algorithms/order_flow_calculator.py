"""
Order Flow Calculator for analyzing buy/sell pressure and market dynamics.

This module implements algorithms for:
- Buy/Sell classification based on trade price vs bid/ask
- Delta calculation (buy volume - sell volume)
- Cumulative delta tracking
- Absorption detection (large orders being absorbed)
- Imbalance detection (significant order flow imbalances)
"""

from typing import List, Optional, Dict, Tuple
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from enum import Enum
import logging

from ..entities import TradeData, OrderBookData

logger = logging.getLogger(__name__)


class TradeType(Enum):
    """Trade classification enum."""
    BUY = "buy"
    SELL = "sell"
    UNKNOWN = "unknown"


@dataclass
class OrderFlowTrade:
    """Trade with order flow classification."""
    trade: TradeData
    trade_type: TradeType
    delta: Decimal  # Positive for buy, negative for sell
    

@dataclass
class OrderFlowLevel:
    """Order flow analysis for a specific price level."""
    price: Decimal
    buy_volume: Decimal
    sell_volume: Decimal
    delta: Decimal  # buy_volume - sell_volume
    trade_count: int
    buy_trade_count: int
    sell_trade_count: int
    avg_trade_size: Decimal
    max_trade_size: Decimal
    volume_percentage: Decimal


@dataclass
class AbsorptionEvent:
    """Detected absorption event."""
    price: Decimal
    timestamp: str
    absorbed_volume: Decimal
    absorption_type: TradeType  # What was being absorbed
    strength: float  # 0-100 absorption strength
    duration_ms: int  # How long the absorption lasted


@dataclass
class ImbalanceEvent:
    """Detected order flow imbalance."""
    price_start: Decimal
    price_end: Decimal
    timestamp: str
    direction: TradeType  # BUY or SELL imbalance
    buy_volume: Decimal
    sell_volume: Decimal
    imbalance_ratio: float  # buy/sell or sell/buy ratio
    strength: float  # 0-100 imbalance strength


@dataclass
class OrderFlowProfile:
    """Complete order flow analysis result."""
    symbol: str
    exchange: str
    start_time: str
    end_time: str
    timeframe: str
    
    # Aggregate metrics
    total_volume: Decimal
    total_buy_volume: Decimal
    total_sell_volume: Decimal
    net_delta: Decimal
    cumulative_delta: Decimal
    
    # Trade statistics
    total_trades: int
    buy_trades: int
    sell_trades: int
    avg_trade_size: Decimal
    
    # Price level analysis
    levels: List[OrderFlowLevel]
    
    # Events
    absorption_events: List[AbsorptionEvent]
    imbalance_events: List[ImbalanceEvent]
    
    # Metrics
    buy_percentage: float
    sell_percentage: float
    delta_momentum: float  # Rate of delta change
    market_efficiency: float  # How balanced the flow is


class OrderFlowCalculator:
    """
    Calculator for order flow analysis including delta, absorption, and imbalances.
    
    Features:
    - Smart buy/sell classification using multiple methods
    - Delta calculation and cumulative tracking
    - Absorption detection using volume and timing analysis
    - Imbalance detection across price levels
    - Market efficiency scoring
    """
    
    def __init__(
        self,
        tick_size: Optional[Decimal] = None,
        absorption_threshold: float = 3.0,  # Multiple of average volume
        imbalance_threshold: float = 2.0,   # Minimum imbalance ratio
        large_trade_threshold: float = 10.0  # Multiple of average for large trades
    ):
        self.tick_size = tick_size
        self.absorption_threshold = absorption_threshold
        self.imbalance_threshold = imbalance_threshold
        self.large_trade_threshold = large_trade_threshold
        
        logger.info(f"OrderFlowCalculator initialized with thresholds: "
                   f"absorption={absorption_threshold}, imbalance={imbalance_threshold}")
    
    def classify_trade(
        self,
        trade: TradeData,
        orderbook: Optional[OrderBookData] = None,
        previous_price: Optional[Decimal] = None
    ) -> TradeType:
        """
        Classify trade as buy or sell using multiple methods.
        
        Priority:
        1. Orderbook-based classification (most accurate)
        2. Price movement classification
        3. Side-based classification (if available)
        
        Args:
            trade: Trade data to classify
            orderbook: Current orderbook (for most accurate classification)
            previous_price: Previous trade price for price movement analysis
            
        Returns:
            TradeType classification
        """
        try:
            # Method 1: Orderbook-based classification (most accurate)
            if orderbook and orderbook.bids and orderbook.asks:
                best_bid = orderbook.bids[0].price
                best_ask = orderbook.asks[0].price
                mid_price = (best_bid + best_ask) / 2
                
                if trade.price >= best_ask:
                    return TradeType.BUY
                elif trade.price <= best_bid:
                    return TradeType.SELL
                elif trade.price > mid_price:
                    return TradeType.BUY
                else:
                    return TradeType.SELL
            
            # Method 2: Price movement classification
            if previous_price:
                if trade.price > previous_price:
                    return TradeType.BUY
                elif trade.price < previous_price:
                    return TradeType.SELL
            
            # Method 3: Side-based (if available from exchange)
            if hasattr(trade, 'side') and trade.side:
                if trade.side.lower() in ['buy', 'b', '1']:
                    return TradeType.BUY
                elif trade.side.lower() in ['sell', 's', '0']:
                    return TradeType.SELL
            
            # Default: Unknown
            return TradeType.UNKNOWN
            
        except Exception as e:
            logger.warning(f"Error classifying trade: {e}")
            return TradeType.UNKNOWN
    
    def calculate_order_flow(
        self,
        trades: List[TradeData],
        symbol: str,
        exchange: str,
        timeframe: str = "1m",
        orderbooks: Optional[List[OrderBookData]] = None
    ) -> OrderFlowProfile:
        """
        Calculate complete order flow analysis for a list of trades.
        
        Args:
            trades: List of trades to analyze
            symbol: Trading pair symbol
            exchange: Exchange name
            timeframe: Analysis timeframe
            orderbooks: Optional orderbook snapshots for better classification
            
        Returns:
            OrderFlowProfile with complete analysis
        """
        if not trades:
            return self._create_empty_profile(symbol, exchange, timeframe)
        
        # Sort trades by timestamp
        sorted_trades = sorted(trades, key=lambda t: t.timestamp)
        
        # Determine tick size if not provided
        if not self.tick_size:
            self.tick_size = self._calculate_tick_size(symbol)
        
        # Classify all trades
        classified_trades = self._classify_all_trades(sorted_trades, orderbooks)
        
        # Calculate price levels
        price_levels = self._calculate_price_levels(classified_trades)
        
        # Detect absorption events
        absorption_events = self._detect_absorption_events(classified_trades, price_levels)
        
        # Detect imbalance events
        imbalance_events = self._detect_imbalance_events(price_levels)
        
        # Calculate aggregate metrics
        total_volume = sum(t.trade.volume for t in classified_trades)
        total_buy_volume = sum(t.trade.volume for t in classified_trades if t.trade_type == TradeType.BUY)
        total_sell_volume = sum(t.trade.volume for t in classified_trades if t.trade_type == TradeType.SELL)
        net_delta = total_buy_volume - total_sell_volume
        
        # Calculate cumulative delta
        cumulative_delta = self._calculate_cumulative_delta(classified_trades)
        
        # Trade statistics
        total_trades = len(classified_trades)
        buy_trades = sum(1 for t in classified_trades if t.trade_type == TradeType.BUY)
        sell_trades = sum(1 for t in classified_trades if t.trade_type == TradeType.SELL)
        avg_trade_size = total_volume / total_trades if total_trades > 0 else Decimal('0')
        
        # Calculate percentages and metrics
        buy_percentage = float(total_buy_volume / total_volume * 100) if total_volume > 0 else 0.0
        sell_percentage = float(total_sell_volume / total_volume * 100) if total_volume > 0 else 0.0
        
        # Delta momentum (simplified - rate of change)
        delta_momentum = self._calculate_delta_momentum(classified_trades)
        
        # Market efficiency (how balanced the flow is)
        market_efficiency = self._calculate_market_efficiency(total_buy_volume, total_sell_volume)
        
        return OrderFlowProfile(
            symbol=symbol,
            exchange=exchange,
            start_time=sorted_trades[0].timestamp.isoformat(),
            end_time=sorted_trades[-1].timestamp.isoformat(),
            timeframe=timeframe,
            total_volume=total_volume,
            total_buy_volume=total_buy_volume,
            total_sell_volume=total_sell_volume,
            net_delta=net_delta,
            cumulative_delta=cumulative_delta,
            total_trades=total_trades,
            buy_trades=buy_trades,
            sell_trades=sell_trades,
            avg_trade_size=avg_trade_size,
            levels=price_levels,
            absorption_events=absorption_events,
            imbalance_events=imbalance_events,
            buy_percentage=buy_percentage,
            sell_percentage=sell_percentage,
            delta_momentum=delta_momentum,
            market_efficiency=market_efficiency
        )
    
    def _classify_all_trades(
        self,
        trades: List[TradeData],
        orderbooks: Optional[List[OrderBookData]] = None
    ) -> List[OrderFlowTrade]:
        """Classify all trades and calculate deltas."""
        classified_trades = []
        previous_price = None
        
        for i, trade in enumerate(trades):
            # Get corresponding orderbook if available
            orderbook = orderbooks[i] if orderbooks and i < len(orderbooks) else None
            
            # Classify trade
            trade_type = self.classify_trade(trade, orderbook, previous_price)
            
            # Calculate delta
            if trade_type == TradeType.BUY:
                delta = trade.volume
            elif trade_type == TradeType.SELL:
                delta = -trade.volume
            else:
                delta = Decimal('0')  # Unknown trades don't contribute to delta
            
            classified_trades.append(OrderFlowTrade(
                trade=trade,
                trade_type=trade_type,
                delta=delta
            ))
            
            previous_price = trade.price
        
        return classified_trades
    
    def _calculate_price_levels(self, classified_trades: List[OrderFlowTrade]) -> List[OrderFlowLevel]:
        """Group trades by price levels and calculate order flow metrics."""
        price_groups: Dict[Decimal, List[OrderFlowTrade]] = {}
        
        # Group trades by rounded price
        for trade in classified_trades:
            rounded_price = self._round_to_tick_size(trade.trade.price)
            if rounded_price not in price_groups:
                price_groups[rounded_price] = []
            price_groups[rounded_price].append(trade)
        
        # Calculate metrics for each price level
        levels = []
        total_volume = sum(t.trade.volume for t in classified_trades)
        
        for price, trades in price_groups.items():
            buy_volume = sum(t.trade.volume for t in trades if t.trade_type == TradeType.BUY)
            sell_volume = sum(t.trade.volume for t in trades if t.trade_type == TradeType.SELL)
            delta = buy_volume - sell_volume
            
            trade_count = len(trades)
            buy_trade_count = sum(1 for t in trades if t.trade_type == TradeType.BUY)
            sell_trade_count = sum(1 for t in trades if t.trade_type == TradeType.SELL)
            
            level_volume = buy_volume + sell_volume
            avg_trade_size = level_volume / trade_count if trade_count > 0 else Decimal('0')
            max_trade_size = max(t.trade.volume for t in trades) if trades else Decimal('0')
            volume_percentage = (level_volume / total_volume * 100) if total_volume > 0 else Decimal('0')
            
            levels.append(OrderFlowLevel(
                price=price,
                buy_volume=buy_volume,
                sell_volume=sell_volume,
                delta=delta,
                trade_count=trade_count,
                buy_trade_count=buy_trade_count,
                sell_trade_count=sell_trade_count,
                avg_trade_size=avg_trade_size,
                max_trade_size=max_trade_size,
                volume_percentage=volume_percentage
            ))
        
        # Sort by price
        return sorted(levels, key=lambda l: l.price)
    
    def _detect_absorption_events(
        self,
        classified_trades: List[OrderFlowTrade],
        price_levels: List[OrderFlowLevel]
    ) -> List[AbsorptionEvent]:
        """Detect absorption events where large orders are being absorbed."""
        absorption_events = []
        
        if not classified_trades:
            return absorption_events
        
        # Calculate average trade size for threshold
        avg_trade_size = sum(t.trade.volume for t in classified_trades) / len(classified_trades)
        large_trade_threshold = avg_trade_size * self.large_trade_threshold
        
        # Look for patterns of large trades being absorbed
        for level in price_levels:
            if level.max_trade_size >= large_trade_threshold:
                # Check if there's significant imbalance at this level
                if level.buy_volume > 0 and level.sell_volume > 0:
                    absorption_ratio = max(level.buy_volume, level.sell_volume) / min(level.buy_volume, level.sell_volume)
                    
                    if absorption_ratio >= self.absorption_threshold:
                        absorption_type = TradeType.BUY if level.sell_volume > level.buy_volume else TradeType.SELL
                        absorbed_volume = min(level.buy_volume, level.sell_volume)
                        strength = min(100.0, float(absorption_ratio) * 10)  # Scale to 0-100
                        
                        # Find timestamp of largest trade at this level
                        trades_at_level = [t for t in classified_trades 
                                         if self._round_to_tick_size(t.trade.price) == level.price]
                        largest_trade = max(trades_at_level, key=lambda t: t.trade.volume)
                        
                        absorption_events.append(AbsorptionEvent(
                            price=level.price,
                            timestamp=largest_trade.trade.timestamp.isoformat(),
                            absorbed_volume=absorbed_volume,
                            absorption_type=absorption_type,
                            strength=strength,
                            duration_ms=0  # TODO: Calculate actual duration
                        ))
        
        return sorted(absorption_events, key=lambda e: e.timestamp)
    
    def _detect_imbalance_events(self, price_levels: List[OrderFlowLevel]) -> List[ImbalanceEvent]:
        """Detect order flow imbalances across price ranges."""
        imbalance_events = []
        
        if len(price_levels) < 2:
            return imbalance_events
        
        # Look for consecutive price levels with strong directional bias
        consecutive_bias = []
        current_direction = None
        start_price = None
        buy_volume_sum = Decimal('0')
        sell_volume_sum = Decimal('0')
        
        for level in price_levels:
            if level.buy_volume == 0 and level.sell_volume == 0:
                continue
                
            # Determine direction of this level
            level_direction = TradeType.BUY if level.buy_volume > level.sell_volume else TradeType.SELL
            imbalance_ratio = max(level.buy_volume, level.sell_volume) / max(min(level.buy_volume, level.sell_volume), Decimal('0.01'))
            
            if imbalance_ratio >= self.imbalance_threshold:
                if current_direction == level_direction:
                    # Continue current imbalance
                    buy_volume_sum += level.buy_volume
                    sell_volume_sum += level.sell_volume
                    consecutive_bias.append(level)
                else:
                    # Process previous imbalance if it exists
                    if len(consecutive_bias) >= 2:  # At least 2 consecutive levels
                        self._add_imbalance_event(
                            imbalance_events, consecutive_bias, current_direction,
                            buy_volume_sum, sell_volume_sum
                        )
                    
                    # Start new imbalance
                    current_direction = level_direction
                    start_price = level.price
                    buy_volume_sum = level.buy_volume
                    sell_volume_sum = level.sell_volume
                    consecutive_bias = [level]
            else:
                # Process previous imbalance if it exists
                if len(consecutive_bias) >= 2:
                    self._add_imbalance_event(
                        imbalance_events, consecutive_bias, current_direction,
                        buy_volume_sum, sell_volume_sum
                    )
                
                # Reset
                consecutive_bias = []
                current_direction = None
                buy_volume_sum = Decimal('0')
                sell_volume_sum = Decimal('0')
        
        # Process final imbalance
        if len(consecutive_bias) >= 2:
            self._add_imbalance_event(
                imbalance_events, consecutive_bias, current_direction,
                buy_volume_sum, sell_volume_sum
            )
        
        return imbalance_events
    
    def _add_imbalance_event(
        self,
        events: List[ImbalanceEvent],
        levels: List[OrderFlowLevel],
        direction: TradeType,
        buy_volume: Decimal,
        sell_volume: Decimal
    ):
        """Add an imbalance event to the list."""
        if not levels:
            return
            
        ratio = float(buy_volume / sell_volume) if direction == TradeType.BUY else float(sell_volume / buy_volume)
        strength = min(100.0, ratio * 20)  # Scale to 0-100
        
        events.append(ImbalanceEvent(
            price_start=levels[0].price,
            price_end=levels[-1].price,
            timestamp=f"Range across {len(levels)} levels",  # TODO: Get actual timestamp
            direction=direction,
            buy_volume=buy_volume,
            sell_volume=sell_volume,
            imbalance_ratio=ratio,
            strength=strength
        ))
    
    def _calculate_cumulative_delta(self, classified_trades: List[OrderFlowTrade]) -> Decimal:
        """Calculate cumulative delta across all trades."""
        cumulative = Decimal('0')
        for trade in classified_trades:
            cumulative += trade.delta
        return cumulative
    
    def _calculate_delta_momentum(self, classified_trades: List[OrderFlowTrade]) -> float:
        """Calculate delta momentum (rate of change)."""
        if len(classified_trades) < 10:
            return 0.0
        
        # Split into first and second half
        mid_point = len(classified_trades) // 2
        first_half_delta = sum(t.delta for t in classified_trades[:mid_point])
        second_half_delta = sum(t.delta for t in classified_trades[mid_point:])
        
        if first_half_delta == 0:
            return 100.0 if second_half_delta > 0 else -100.0
        
        momentum = float((second_half_delta - first_half_delta) / abs(first_half_delta) * 100)
        return max(-100.0, min(100.0, momentum))
    
    def _calculate_market_efficiency(self, buy_volume: Decimal, sell_volume: Decimal) -> float:
        """Calculate market efficiency (how balanced buy/sell flow is)."""
        total_volume = buy_volume + sell_volume
        if total_volume == 0:
            return 100.0
        
        balance = min(buy_volume, sell_volume) / total_volume * 2  # 0 to 1
        return float(balance * 100)  # Convert to percentage
    
    def _calculate_tick_size(self, symbol: str) -> Decimal:
        """Calculate appropriate tick size based on symbol."""
        if symbol.endswith('USDT') or symbol.endswith('USDC'):
            if symbol.startswith('BTC') or symbol.startswith('ETH'):
                return Decimal('0.01')
            else:
                return Decimal('0.0001')
        return Decimal('0.00001')
    
    def _round_to_tick_size(self, price: Decimal) -> Decimal:
        """Round price to nearest tick size."""
        if self.tick_size and self.tick_size > 0:
            return (price / self.tick_size).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * self.tick_size
        return price
    
    def _create_empty_profile(self, symbol: str, exchange: str, timeframe: str) -> OrderFlowProfile:
        """Create empty order flow profile for when no trades available."""
        return OrderFlowProfile(
            symbol=symbol,
            exchange=exchange,
            start_time="",
            end_time="",
            timeframe=timeframe,
            total_volume=Decimal('0'),
            total_buy_volume=Decimal('0'),
            total_sell_volume=Decimal('0'),
            net_delta=Decimal('0'),
            cumulative_delta=Decimal('0'),
            total_trades=0,
            buy_trades=0,
            sell_trades=0,
            avg_trade_size=Decimal('0'),
            levels=[],
            absorption_events=[],
            imbalance_events=[],
            buy_percentage=0.0,
            sell_percentage=0.0,
            delta_momentum=0.0,
            market_efficiency=100.0
        )
