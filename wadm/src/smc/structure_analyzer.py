"""
Market Structure Analysis with Break of Structure Detection

Real implementation - NO PLACEHOLDERS
Detects swing highs/lows, BOS, CHoCH with institutional confirmation
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np
from ..logger import get_logger

logger = get_logger(__name__)

class SwingType(str, Enum):
    """Swing point types"""
    HIGH = "high"
    LOW = "low"

class StructureBreakType(str, Enum):
    """Structure break types"""
    BOS = "break_of_structure"  # Continuation
    CHOCH = "change_of_character"  # Reversal

class TrendDirection(str, Enum):
    """Market trend direction"""
    BULLISH = "bullish"
    BEARISH = "bearish"
    RANGING = "ranging"

@dataclass
class SwingPoint:
    """Market structure swing point"""
    type: SwingType
    price: float
    timestamp: datetime
    strength: int  # Number of candles used to confirm
    volume: float
    institutional_ratio: float

@dataclass
class StructureBreak:
    """Break of market structure"""
    id: str
    type: StructureBreakType
    direction: TrendDirection
    break_price: float
    break_time: datetime
    previous_swing: SwingPoint
    confirmation_volume: float
    institutional_confirmation: bool
    exchanges_confirmed: List[str]
    strength_score: float  # 0-100

@dataclass
class MarketStructure:
    """Complete market structure analysis"""
    symbol: str
    timestamp: datetime
    trend: TrendDirection
    trend_strength: float  # 0-100
    
    # Swing points
    swing_highs: List[SwingPoint]
    swing_lows: List[SwingPoint]
    current_swing_high: Optional[SwingPoint]
    current_swing_low: Optional[SwingPoint]
    
    # Structure breaks
    structure_breaks: List[StructureBreak]
    last_bos: Optional[StructureBreak]
    last_choch: Optional[StructureBreak]
    
    # Institutional metrics
    institutional_bias: str  # bullish/bearish/neutral
    smart_money_trend: TrendDirection
    divergence_detected: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp,
            "trend": self.trend.value,
            "trend_strength": self.trend_strength,
            "swing_highs_count": len(self.swing_highs),
            "swing_lows_count": len(self.swing_lows),
            "current_swing_high": self.current_swing_high.price if self.current_swing_high else None,
            "current_swing_low": self.current_swing_low.price if self.current_swing_low else None,
            "structure_breaks_count": len(self.structure_breaks),
            "last_bos": self.last_bos.type.value if self.last_bos else None,
            "last_choch": self.last_choch.type.value if self.last_choch else None,
            "institutional_bias": self.institutional_bias,
            "smart_money_trend": self.smart_money_trend.value,
            "divergence_detected": self.divergence_detected
        }

class StructureAnalyzer:
    """Market structure analyzer with institutional validation"""
    
    def __init__(self, storage_manager=None):
        self.storage = storage_manager
        self.swing_strength = 5  # Candles on each side for swing
        self.min_swing_size = 0.1  # Minimum 0.1% move for valid swing
        self.lookback_periods = 100
        
        # Cache
        self.market_structures: Dict[str, MarketStructure] = {}
        
        logger.info("StructureAnalyzer initialized with institutional validation")
    
    async def analyze_market_structure(self, symbol: str, timeframe: str = "15min") -> MarketStructure:
        """
        Analyze complete market structure
        
        Args:
            symbol: Trading pair
            timeframe: Analysis timeframe
            
        Returns:
            Complete market structure analysis
        """
        try:
            # Get multi-exchange candles
            candles = await self._get_candles(symbol, timeframe)
            
            if len(candles) < self.swing_strength * 2 + 1:
                logger.debug(f"Not enough candles for structure analysis: {len(candles)}")
                return self._empty_structure(symbol)
            
            # Detect swing points
            swing_highs, swing_lows = self._detect_swings(candles)
            
            # Detect structure breaks
            structure_breaks = self._detect_structure_breaks(
                candles, swing_highs, swing_lows, symbol
            )
            
            # Determine trend
            trend, trend_strength = self._determine_trend(
                swing_highs, swing_lows, structure_breaks
            )
            
            # Analyze institutional bias
            inst_bias = self._analyze_institutional_bias(candles, structure_breaks)
            
            # Find current swings
            current_high = swing_highs[-1] if swing_highs else None
            current_low = swing_lows[-1] if swing_lows else None
            
            # Get last breaks
            last_bos = None
            last_choch = None
            for sb in reversed(structure_breaks):
                if not last_bos and sb.type == StructureBreakType.BOS:
                    last_bos = sb
                if not last_choch and sb.type == StructureBreakType.CHOCH:
                    last_choch = sb
                if last_bos and last_choch:
                    break
            
            # Check for divergence
            divergence = self._check_divergence(candles, trend, inst_bias)
            
            # Create structure
            structure = MarketStructure(
                symbol=symbol,
                timestamp=datetime.now(timezone.utc),
                trend=trend,
                trend_strength=trend_strength,
                swing_highs=swing_highs,
                swing_lows=swing_lows,
                current_swing_high=current_high,
                current_swing_low=current_low,
                structure_breaks=structure_breaks,
                last_bos=last_bos,
                last_choch=last_choch,
                institutional_bias=inst_bias,
                smart_money_trend=self._get_smart_money_trend(inst_bias, trend),
                divergence_detected=divergence
            )
            
            # Cache and save
            self.market_structures[symbol] = structure
            
            if self.storage:
                self.storage.save_smc_analysis({
                    "type": "market_structure",
                    "symbol": symbol,
                    "timestamp": structure.timestamp,
                    "data": structure.to_dict()
                })
            
            # Log summary
            logger.info(f"[Structure] {symbol}: {trend.value} trend (strength={trend_strength:.1f}%), "
                       f"{len(structure_breaks)} breaks, institutional_bias={inst_bias}")
            
            return structure
            
        except Exception as e:
            logger.error(f"Error analyzing structure for {symbol}: {e}", exc_info=True)
            return self._empty_structure(symbol)
    
    def _empty_structure(self, symbol: str) -> MarketStructure:
        """Return empty structure when no data available"""
        return MarketStructure(
            symbol=symbol,
            timestamp=datetime.now(timezone.utc),
            trend=TrendDirection.RANGING,
            trend_strength=0.0,
            swing_highs=[],
            swing_lows=[],
            current_swing_high=None,
            current_swing_low=None,
            structure_breaks=[],
            last_bos=None,
            last_choch=None,
            institutional_bias="neutral",
            smart_money_trend=TrendDirection.RANGING,
            divergence_detected=False
        )
    
    async def _get_candles(self, symbol: str, timeframe: str) -> List[Dict[str, Any]]:
        """Get candles from storage"""
        if not self.storage:
            return []
        
        # Get timeframe in minutes
        tf_minutes = {
            "1min": 1, "5min": 5, "15min": 15, "30min": 30,
            "1h": 60, "4h": 240, "1d": 1440
        }.get(timeframe, 15)
        
        # Get trades and build candles
        all_candles = []
        
        for exchange in ["bybit", "binance", "coinbase", "kraken"]:
            trades = self.storage.get_recent_trades(
                symbol, exchange,
                minutes=tf_minutes * self.lookback_periods
            )
            
            if trades:
                candles = self._trades_to_candles(trades, tf_minutes)
                for candle in candles:
                    candle['exchange'] = exchange
                    candle['is_institutional'] = exchange in ['coinbase', 'kraken']
                all_candles.extend(candles)
        
        # Sort and merge
        all_candles.sort(key=lambda x: x['timestamp'])
        return self._merge_candles(all_candles, tf_minutes)
    
    def _trades_to_candles(self, trades: List[Dict], tf_minutes: int) -> List[Dict]:
        """Convert trades to candles"""
        if not trades:
            return []
        
        candles = {}
        
        for trade in trades:
            trade_time = trade['timestamp']
            if isinstance(trade_time, str):
                trade_time = datetime.fromisoformat(trade_time.replace('Z', '+00:00'))
            
            # Round to candle period
            period = trade_time.replace(
                minute=(trade_time.minute // tf_minutes) * tf_minutes,
                second=0, microsecond=0
            )
            
            if period not in candles:
                candles[period] = {
                    'timestamp': period,
                    'open': float(trade['price']),
                    'high': float(trade['price']),
                    'low': float(trade['price']),
                    'close': float(trade['price']),
                    'volume': 0.0,
                    'buy_volume': 0.0,
                    'trades': 0
                }
            
            candle = candles[period]
            price = float(trade['price'])
            volume = float(trade['quantity'])
            
            candle['high'] = max(candle['high'], price)
            candle['low'] = min(candle['low'], price)
            candle['close'] = price
            candle['volume'] += volume
            candle['trades'] += 1
            
            if trade.get('side', '').lower() == 'buy':
                candle['buy_volume'] += volume
        
        return sorted(candles.values(), key=lambda x: x['timestamp'])
    
    def _merge_candles(self, candles: List[Dict], tf_minutes: int) -> List[Dict]:
        """Merge candles from multiple exchanges"""
        merged = {}
        
        for candle in candles:
            period = candle['timestamp']
            
            if period not in merged:
                merged[period] = {
                    'timestamp': period,
                    'open': candle['open'],
                    'high': candle['high'],
                    'low': candle['low'],
                    'close': candle['close'],
                    'volume': 0.0,
                    'buy_volume': 0.0,
                    'institutional_volume': 0.0,
                    'retail_volume': 0.0,
                    'trades': 0,
                    'exchanges': []
                }
            
            m = merged[period]
            m['high'] = max(m['high'], candle['high'])
            m['low'] = min(m['low'], candle['low'])
            m['close'] = candle['close']  # Use latest
            m['volume'] += candle['volume']
            m['buy_volume'] += candle.get('buy_volume', 0)
            m['trades'] += candle['trades']
            
            if candle['exchange'] not in m['exchanges']:
                m['exchanges'].append(candle['exchange'])
            
            if candle.get('is_institutional'):
                m['institutional_volume'] += candle['volume']
            else:
                m['retail_volume'] += candle['volume']
        
        return sorted(merged.values(), key=lambda x: x['timestamp'])
    
    def _detect_swings(self, candles: List[Dict]) -> Tuple[List[SwingPoint], List[SwingPoint]]:
        """Detect swing highs and lows"""
        swing_highs = []
        swing_lows = []
        
        if len(candles) < self.swing_strength * 2 + 1:
            return swing_highs, swing_lows
        
        for i in range(self.swing_strength, len(candles) - self.swing_strength):
            current = candles[i]
            
            # Check for swing high
            is_swing_high = True
            for j in range(1, self.swing_strength + 1):
                if candles[i-j]['high'] >= current['high'] or candles[i+j]['high'] >= current['high']:
                    is_swing_high = False
                    break
            
            if is_swing_high:
                # Check minimum swing size
                avg_price = np.mean([c['close'] for c in candles[max(0, i-10):i]])
                swing_size_pct = abs(current['high'] - avg_price) / avg_price * 100
                
                if swing_size_pct >= self.min_swing_size:
                    swing_highs.append(SwingPoint(
                        type=SwingType.HIGH,
                        price=current['high'],
                        timestamp=current['timestamp'],
                        strength=self.swing_strength,
                        volume=current['volume'],
                        institutional_ratio=current['institutional_volume'] / current['volume'] if current['volume'] > 0 else 0
                    ))
            
            # Check for swing low
            is_swing_low = True
            for j in range(1, self.swing_strength + 1):
                if candles[i-j]['low'] <= current['low'] or candles[i+j]['low'] <= current['low']:
                    is_swing_low = False
                    break
            
            if is_swing_low:
                # Check minimum swing size
                avg_price = np.mean([c['close'] for c in candles[max(0, i-10):i]])
                swing_size_pct = abs(current['low'] - avg_price) / avg_price * 100
                
                if swing_size_pct >= self.min_swing_size:
                    swing_lows.append(SwingPoint(
                        type=SwingType.LOW,
                        price=current['low'],
                        timestamp=current['timestamp'],
                        strength=self.swing_strength,
                        volume=current['volume'],
                        institutional_ratio=current['institutional_volume'] / current['volume'] if current['volume'] > 0 else 0
                    ))
        
        return swing_highs, swing_lows
    
    def _detect_structure_breaks(self, candles: List[Dict], 
                                swing_highs: List[SwingPoint],
                                swing_lows: List[SwingPoint],
                                symbol: str) -> List[StructureBreak]:
        """Detect BOS and CHoCH"""
        breaks = []
        
        # Combine and sort swings
        all_swings = swing_highs + swing_lows
        all_swings.sort(key=lambda x: x.timestamp)
        
        if len(all_swings) < 3:
            return breaks
        
        # Track current trend
        current_trend = TrendDirection.RANGING
        
        for i in range(2, len(all_swings)):
            prev_prev = all_swings[i-2]
            prev = all_swings[i-1]
            current = all_swings[i]
            
            # Find candle where break occurred
            break_candle = None
            for candle in candles:
                if prev.timestamp < candle['timestamp'] <= current.timestamp:
                    # Check if price broke structure
                    if current.type == SwingType.HIGH and prev.type == SwingType.HIGH:
                        if candle['high'] > prev.price:
                            break_candle = candle
                            break
                    elif current.type == SwingType.LOW and prev.type == SwingType.LOW:
                        if candle['low'] < prev.price:
                            break_candle = candle
                            break
            
            if not break_candle:
                continue
            
            # Determine break type
            break_type = None
            new_trend = current_trend
            
            # Bullish structure
            if current.type == SwingType.HIGH and current.price > prev.price:
                if prev_prev.type == SwingType.LOW and prev.type == SwingType.HIGH:
                    if current_trend == TrendDirection.BULLISH:
                        break_type = StructureBreakType.BOS  # Continuation
                    else:
                        break_type = StructureBreakType.CHOCH  # Change
                        new_trend = TrendDirection.BULLISH
            
            # Bearish structure
            elif current.type == SwingType.LOW and current.price < prev.price:
                if prev_prev.type == SwingType.HIGH and prev.type == SwingType.LOW:
                    if current_trend == TrendDirection.BEARISH:
                        break_type = StructureBreakType.BOS  # Continuation
                    else:
                        break_type = StructureBreakType.CHOCH  # Change
                        new_trend = TrendDirection.BEARISH
            
            if break_type:
                # Calculate strength
                vol_ratio = break_candle['volume'] / np.mean([c['volume'] for c in candles[-20:]])
                inst_ratio = break_candle['institutional_volume'] / break_candle['volume'] if break_candle['volume'] > 0 else 0
                
                strength_score = min(100, (
                    vol_ratio * 20 +  # Volume importance
                    inst_ratio * 50 +  # Institutional importance
                    len(break_candle['exchanges']) * 10  # Multi-exchange confirmation
                ))
                
                breaks.append(StructureBreak(
                    id=f"SB_{symbol}_{break_candle['timestamp'].isoformat()}",
                    type=break_type,
                    direction=new_trend,
                    break_price=break_candle['close'],
                    break_time=break_candle['timestamp'],
                    previous_swing=prev,
                    confirmation_volume=break_candle['volume'],
                    institutional_confirmation=inst_ratio > 0.3,
                    exchanges_confirmed=break_candle['exchanges'],
                    strength_score=strength_score
                ))
                
                current_trend = new_trend
        
        return breaks
    
    def _determine_trend(self, swing_highs: List[SwingPoint],
                        swing_lows: List[SwingPoint],
                        breaks: List[StructureBreak]) -> Tuple[TrendDirection, float]:
        """Determine current trend and strength"""
        if not breaks:
            return TrendDirection.RANGING, 0.0
        
        # Get recent breaks
        recent_breaks = breaks[-5:]
        
        # Count break types
        bullish_breaks = sum(1 for b in recent_breaks if b.direction == TrendDirection.BULLISH)
        bearish_breaks = sum(1 for b in recent_breaks if b.direction == TrendDirection.BEARISH)
        
        # Average strength
        avg_strength = np.mean([b.strength_score for b in recent_breaks])
        
        if bullish_breaks > bearish_breaks:
            return TrendDirection.BULLISH, avg_strength
        elif bearish_breaks > bullish_breaks:
            return TrendDirection.BEARISH, avg_strength
        else:
            return TrendDirection.RANGING, avg_strength * 0.5
    
    def _analyze_institutional_bias(self, candles: List[Dict],
                                   breaks: List[StructureBreak]) -> str:
        """Analyze institutional bias"""
        if not candles or not breaks:
            return "neutral"
        
        # Recent institutional volume ratio
        recent_candles = candles[-20:]
        total_inst = sum(c['institutional_volume'] for c in recent_candles)
        total_retail = sum(c['retail_volume'] for c in recent_candles)
        
        if total_inst + total_retail == 0:
            return "neutral"
        
        inst_ratio = total_inst / (total_inst + total_retail)
        
        # Recent break confirmation
        recent_breaks = breaks[-3:]
        inst_confirmed = sum(1 for b in recent_breaks if b.institutional_confirmation)
        
        # Determine bias
        if inst_ratio > 0.4 and inst_confirmed >= 2:
            # Check direction of institutional breaks
            inst_bullish = sum(1 for b in recent_breaks 
                             if b.institutional_confirmation and b.direction == TrendDirection.BULLISH)
            inst_bearish = sum(1 for b in recent_breaks
                             if b.institutional_confirmation and b.direction == TrendDirection.BEARISH)
            
            if inst_bullish > inst_bearish:
                return "bullish"
            elif inst_bearish > inst_bullish:
                return "bearish"
        
        return "neutral"
    
    def _check_divergence(self, candles: List[Dict], trend: TrendDirection,
                         inst_bias: str) -> bool:
        """Check for divergence between price and institutional activity"""
        # Simple divergence check
        if trend == TrendDirection.BULLISH and inst_bias == "bearish":
            return True
        elif trend == TrendDirection.BEARISH and inst_bias == "bullish":
            return True
        
        return False
    
    def _get_smart_money_trend(self, inst_bias: str, price_trend: TrendDirection) -> TrendDirection:
        """Determine smart money trend"""
        if inst_bias == "bullish":
            return TrendDirection.BULLISH
        elif inst_bias == "bearish":
            return TrendDirection.BEARISH
        else:
            return price_trend
    
    def validate_structure_break(self, sb: StructureBreak, current_price: float) -> bool:
        """Validate if structure break is still valid"""
        # Check if price has invalidated the break
        if sb.direction == TrendDirection.BULLISH:
            # Bullish break invalid if price goes below break level
            return current_price > sb.break_price * 0.99  # 1% tolerance
        else:
            # Bearish break invalid if price goes above break level
            return current_price < sb.break_price * 1.01  # 1% tolerance
    
    def get_key_levels(self, symbol: str) -> List[Dict[str, Any]]:
        """Get key structure levels"""
        structure = self.market_structures.get(symbol)
        if not structure:
            return []
        
        levels = []
        
        # Add swing highs as resistance
        for sh in structure.swing_highs[-5:]:
            levels.append({
                'price': sh.price,
                'type': 'resistance',
                'strength': sh.institutional_ratio * 100,
                'timestamp': sh.timestamp
            })
        
        # Add swing lows as support
        for sl in structure.swing_lows[-5:]:
            levels.append({
                'price': sl.price,
                'type': 'support',
                'strength': sl.institutional_ratio * 100,
                'timestamp': sl.timestamp
            })
        
        # Sort by price
        levels.sort(key=lambda x: x['price'])
        
        return levels
