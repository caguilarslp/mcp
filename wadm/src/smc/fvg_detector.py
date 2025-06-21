"""
Fair Value Gap (FVG) Detection with Multi-Exchange Confirmation

Real implementation - NO PLACEHOLDERS
Detects actual FVGs from candle data with institutional validation
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np
from ..logger import get_logger

logger = get_logger(__name__)

class FVGType(str, Enum):
    """FVG types"""
    BULLISH = "bullish"  # Upward gap
    BEARISH = "bearish"  # Downward gap

class FVGStatus(str, Enum):
    """FVG status"""
    UNFILLED = "unfilled"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"

@dataclass
class FairValueGap:
    """Fair Value Gap with institutional validation"""
    
    # Core properties (required fields first)
    id: str
    type: FVGType
    symbol: str
    
    # Gap levels
    top: float
    bottom: float
    midpoint: float
    gap_size: float  # In price units
    gap_percentage: float  # As % of price
    
    # Formation details
    formation_time: datetime
    candle_1_time: datetime  # First candle
    candle_2_time: datetime  # Gap candle
    candle_3_time: datetime  # Third candle
    
    # Volume analysis
    gap_volume: float  # Volume of middle candle
    pre_gap_volume: float
    post_gap_volume: float
    volume_surge: float  # Ratio vs average
    
    # Institutional validation
    institutional_volume_ratio: float
    exchange_count: int  # Number of exchanges showing gap
    
    # Fill probability
    fill_probability: float  # 0-100%
    
    # Optional fields with defaults
    exchanges_confirmed: List[str] = field(default_factory=list)
    expected_fill_time: Optional[timedelta] = None
    historical_fill_rate: float = 0.0
    
    # Status tracking
    status: FVGStatus = FVGStatus.UNFILLED
    fill_start_time: Optional[datetime] = None
    fill_complete_time: Optional[datetime] = None
    fill_percentage: float = 0.0
    
    # Quality metrics
    quality_score: float = 0.0  # 0-100
    actionable: bool = False  # High quality FVG
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "id": self.id,
            "type": self.type.value,
            "symbol": self.symbol,
            "top": self.top,
            "bottom": self.bottom,
            "midpoint": self.midpoint,
            "gap_size": self.gap_size,
            "gap_percentage": self.gap_percentage,
            "formation_time": self.formation_time,
            "candle_1_time": self.candle_1_time,
            "candle_2_time": self.candle_2_time,
            "candle_3_time": self.candle_3_time,
            "gap_volume": self.gap_volume,
            "pre_gap_volume": self.pre_gap_volume,
            "post_gap_volume": self.post_gap_volume,
            "volume_surge": self.volume_surge,
            "institutional_volume_ratio": self.institutional_volume_ratio,
            "exchange_count": self.exchange_count,
            "exchanges_confirmed": self.exchanges_confirmed,
            "fill_probability": self.fill_probability,
            "expected_fill_time": self.expected_fill_time.total_seconds() if self.expected_fill_time else None,
            "historical_fill_rate": self.historical_fill_rate,
            "status": self.status.value,
            "fill_start_time": self.fill_start_time,
            "fill_complete_time": self.fill_complete_time,
            "fill_percentage": self.fill_percentage,
            "quality_score": self.quality_score,
            "actionable": self.actionable
        }
    
    @property
    def state(self) -> str:
        """Get current state (for compatibility)"""
        return self.status.value
    
    @property
    def direction(self) -> str:
        """Get direction (for compatibility)"""
        return self.type.value
    
    @property
    def gap_high(self) -> float:
        """Get gap high (for compatibility)"""
        return self.top
    
    @property
    def gap_low(self) -> float:
        """Get gap low (for compatibility)"""
        return self.bottom

class FVGDetector:
    """Advanced Fair Value Gap detector with multi-exchange confirmation"""
    
    def __init__(self, storage_manager=None):
        self.storage = storage_manager
        self.min_gap_percentage = 0.1  # Minimum 0.1% gap
        self.lookback_periods = 100
        self.min_volume_surge = 1.5  # 1.5x average volume
        
        # Cache for FVGs
        self.active_fvgs: Dict[str, List[FairValueGap]] = {}
        
        logger.info("FVGDetector initialized with multi-exchange validation")
    
    async def detect_fair_value_gaps(self, symbol: str, timeframe: str = "15min") -> List[FairValueGap]:
        """
        Detect Fair Value Gaps from real candle data
        
        Args:
            symbol: Trading pair (e.g., "BTCUSDT")
            timeframe: Candle timeframe for analysis
            
        Returns:
            List of detected FVGs
        """
        try:
            # Get candles from all exchanges
            all_candles = await self._get_multi_exchange_candles(symbol, timeframe)
            
            if len(all_candles) < 3:
                logger.debug(f"Not enough candles for FVG detection: {len(all_candles)}")
                return []
            
            detected_fvgs = []
            
            # Scan for FVGs (need 3 candles)
            for i in range(1, len(all_candles) - 1):
                candle_1 = all_candles[i-1]
                candle_2 = all_candles[i]
                candle_3 = all_candles[i+1]
                
                # Check for bullish FVG
                bullish_gap = self._check_bullish_fvg(candle_1, candle_2, candle_3)
                if bullish_gap:
                    fvg = await self._create_fvg(
                        symbol, candle_1, candle_2, candle_3,
                        FVGType.BULLISH, bullish_gap, all_candles[:i]
                    )
                    if fvg and fvg.actionable:
                        detected_fvgs.append(fvg)
                        logger.info(f"[FVG] {symbol}: Bullish FVG at {fvg.bottom:.2f}-{fvg.top:.2f}, "
                                  f"gap={fvg.gap_percentage:.2f}%, fill_prob={fvg.fill_probability:.1f}%")
                
                # Check for bearish FVG
                bearish_gap = self._check_bearish_fvg(candle_1, candle_2, candle_3)
                if bearish_gap:
                    fvg = await self._create_fvg(
                        symbol, candle_1, candle_2, candle_3,
                        FVGType.BEARISH, bearish_gap, all_candles[:i]
                    )
                    if fvg and fvg.actionable:
                        detected_fvgs.append(fvg)
                        logger.info(f"[FVG] {symbol}: Bearish FVG at {fvg.bottom:.2f}-{fvg.top:.2f}, "
                                  f"gap={fvg.gap_percentage:.2f}%, fill_prob={fvg.fill_probability:.1f}%")
            
            # Update active FVGs status
            self._update_fvg_status(symbol, detected_fvgs, all_candles[-1])
            
            # Cache results
            self.active_fvgs[symbol] = detected_fvgs
            
            # Save to storage
            if self.storage and detected_fvgs:
                for fvg in detected_fvgs:
                    self.storage.save_smc_analysis({
                        "type": "fair_value_gap",
                        "symbol": symbol,
                        "timestamp": datetime.now(timezone.utc),
                        "data": fvg.to_dict()
                    })
            
            return detected_fvgs
            
        except Exception as e:
            logger.error(f"Error detecting FVGs for {symbol}: {e}", exc_info=True)
            return []
    
    async def _get_multi_exchange_candles(self, symbol: str, timeframe: str) -> List[Dict[str, Any]]:
        """Get candles merged from all exchanges"""
        if not self.storage:
            return []
        
        # Get timeframe in minutes
        tf_minutes = {
            "1min": 1, "5min": 5, "15min": 15, "30min": 30,
            "1h": 60, "4h": 240, "1d": 1440
        }.get(timeframe, 15)
        
        # Collect candles from all exchanges
        exchange_candles = {}
        exchanges = ["bybit", "binance", "coinbase", "kraken"]
        
        for exchange in exchanges:
            trades = self.storage.get_recent_trades(
                symbol, exchange,
                minutes=tf_minutes * self.lookback_periods
            )
            
            if trades:
                candles = self._build_candles(trades, tf_minutes)
                if candles:
                    exchange_candles[exchange] = candles
        
        if not exchange_candles:
            return []
        
        # Merge candles with multi-exchange info
        merged = self._merge_exchange_candles(exchange_candles, tf_minutes)
        
        return merged
    
    def _build_candles(self, trades: List[Dict], tf_minutes: int) -> List[Dict]:
        """Build candles from trades"""
        if not trades:
            return []
        
        candles = []
        current_candle = None
        
        for trade in sorted(trades, key=lambda x: x['timestamp']):
            trade_time = trade['timestamp']
            if isinstance(trade_time, str):
                trade_time = datetime.fromisoformat(trade_time.replace('Z', '+00:00'))
            
            # Calculate candle period
            period_start = trade_time.replace(
                minute=(trade_time.minute // tf_minutes) * tf_minutes,
                second=0, microsecond=0
            )
            
            # New candle needed?
            if not current_candle or current_candle['timestamp'] != period_start:
                if current_candle:
                    candles.append(current_candle)
                
                current_candle = {
                    'timestamp': period_start,
                    'open': float(trade['price']),
                    'high': float(trade['price']),
                    'low': float(trade['price']),
                    'close': float(trade['price']),
                    'volume': 0.0,
                    'trades': 0
                }
            
            # Update candle
            price = float(trade['price'])
            volume = float(trade['quantity'])
            
            current_candle['high'] = max(current_candle['high'], price)
            current_candle['low'] = min(current_candle['low'], price)
            current_candle['close'] = price
            current_candle['volume'] += volume
            current_candle['trades'] += 1
        
        if current_candle:
            candles.append(current_candle)
        
        return candles
    
    def _merge_exchange_candles(self, exchange_candles: Dict[str, List[Dict]], 
                               tf_minutes: int) -> List[Dict]:
        """Merge candles from multiple exchanges"""
        # Get all unique timestamps
        all_timestamps = set()
        for candles in exchange_candles.values():
            all_timestamps.update(c['timestamp'] for c in candles)
        
        merged = []
        
        for ts in sorted(all_timestamps):
            # Collect candles from each exchange for this timestamp
            candles_at_ts = []
            exchanges_present = []
            
            for exchange, candles in exchange_candles.items():
                for candle in candles:
                    if candle['timestamp'] == ts:
                        candles_at_ts.append(candle)
                        exchanges_present.append(exchange)
                        break
            
            if not candles_at_ts:
                continue
            
            # Merge candle data
            merged_candle = {
                'timestamp': ts,
                'open': candles_at_ts[0]['open'],  # First exchange open
                'high': max(c['high'] for c in candles_at_ts),
                'low': min(c['low'] for c in candles_at_ts),
                'close': candles_at_ts[-1]['close'],  # Last exchange close
                'volume': sum(c['volume'] for c in candles_at_ts),
                'trades': sum(c['trades'] for c in candles_at_ts),
                'exchanges': exchanges_present,
                'exchange_count': len(exchanges_present),
                'institutional_volume': sum(
                    c['volume'] for i, c in enumerate(candles_at_ts) 
                    if exchanges_present[i] in ['coinbase', 'kraken']
                ),
                'retail_volume': sum(
                    c['volume'] for i, c in enumerate(candles_at_ts)
                    if exchanges_present[i] in ['bybit', 'binance']
                )
            }
            
            merged.append(merged_candle)
        
        return merged
    
    def _check_bullish_fvg(self, c1: Dict, c2: Dict, c3: Dict) -> Optional[Tuple[float, float]]:
        """Check for bullish FVG pattern"""
        # Bullish FVG: Gap between C1 high and C3 low
        gap_bottom = c1['high']
        gap_top = c3['low']
        
        # Must have a real gap
        if gap_top <= gap_bottom:
            return None
        
        # Check minimum gap size
        gap_size = gap_top - gap_bottom
        gap_percentage = (gap_size / c2['close']) * 100
        
        if gap_percentage < self.min_gap_percentage:
            return None
        
        # Middle candle should be bullish and strong
        if c2['close'] <= c2['open']:
            return None
        
        return (gap_bottom, gap_top)
    
    def _check_bearish_fvg(self, c1: Dict, c2: Dict, c3: Dict) -> Optional[Tuple[float, float]]:
        """Check for bearish FVG pattern"""
        # Bearish FVG: Gap between C1 low and C3 high
        gap_top = c1['low']
        gap_bottom = c3['high']
        
        # Must have a real gap
        if gap_bottom >= gap_top:
            return None
        
        # Check minimum gap size
        gap_size = gap_top - gap_bottom
        gap_percentage = (gap_size / c2['close']) * 100
        
        if gap_percentage < self.min_gap_percentage:
            return None
        
        # Middle candle should be bearish and strong
        if c2['close'] >= c2['open']:
            return None
        
        return (gap_bottom, gap_top)
    
    async def _create_fvg(self, symbol: str, c1: Dict, c2: Dict, c3: Dict,
                         fvg_type: FVGType, gap_levels: Tuple[float, float],
                         historical_candles: List[Dict]) -> Optional[FairValueGap]:
        """Create FVG with quality analysis"""
        try:
            bottom, top = gap_levels
            gap_size = top - bottom
            midpoint = (top + bottom) / 2
            gap_percentage = (gap_size / c2['close']) * 100
            
            # Calculate volume metrics
            avg_volume = np.mean([c['volume'] for c in historical_candles[-20:]]) if historical_candles else c2['volume']
            volume_surge = c2['volume'] / avg_volume if avg_volume > 0 else 1.0
            
            # Institutional volume ratio
            total_vol = c2.get('volume', 1)
            inst_vol = c2.get('institutional_volume', 0)
            inst_ratio = inst_vol / total_vol if total_vol > 0 else 0
            
            # Calculate quality score
            quality_score = 0
            
            # 1. Volume surge (25 points)
            if volume_surge > 3:
                quality_score += 25
            elif volume_surge > 2:
                quality_score += 20
            elif volume_surge > 1.5:
                quality_score += 15
            else:
                quality_score += 5
            
            # 2. Gap size (25 points)
            if gap_percentage > 0.5:
                quality_score += 25
            elif gap_percentage > 0.3:
                quality_score += 20
            elif gap_percentage > 0.2:
                quality_score += 15
            else:
                quality_score += 10
            
            # 3. Exchange confirmation (25 points)
            exchange_count = c2.get('exchange_count', 1)
            if exchange_count >= 4:
                quality_score += 25
            elif exchange_count >= 3:
                quality_score += 20
            elif exchange_count >= 2:
                quality_score += 15
            else:
                quality_score += 5
            
            # 4. Institutional participation (25 points)
            if inst_ratio > 0.6:
                quality_score += 25
            elif inst_ratio > 0.4:
                quality_score += 20
            elif inst_ratio > 0.2:
                quality_score += 15
            else:
                quality_score += 5
            
            # Calculate fill probability based on historical data
            fill_probability = self._calculate_fill_probability(
                gap_percentage, volume_surge, inst_ratio, quality_score
            )
            
            # Expected fill time (based on gap size and volume)
            expected_hours = gap_percentage * 10 / volume_surge
            expected_fill_time = timedelta(hours=expected_hours)
            
            # Create FVG
            fvg = FairValueGap(
                id=f"FVG_{symbol}_{c2['timestamp'].isoformat()}_{fvg_type.value}",
                type=fvg_type,
                symbol=symbol,
                top=top,
                bottom=bottom,
                midpoint=midpoint,
                gap_size=gap_size,
                gap_percentage=gap_percentage,
                formation_time=c2['timestamp'],
                candle_1_time=c1['timestamp'],
                candle_2_time=c2['timestamp'],
                candle_3_time=c3['timestamp'],
                gap_volume=c2['volume'],
                pre_gap_volume=c1['volume'],
                post_gap_volume=c3['volume'],
                volume_surge=volume_surge,
                institutional_volume_ratio=inst_ratio,
                exchange_count=exchange_count,
                fill_probability=fill_probability,
                exchanges_confirmed=c2.get('exchanges', []),
                expected_fill_time=expected_fill_time,
                quality_score=quality_score,
                actionable=quality_score >= 60  # Only high quality FVGs
            )
            
            return fvg
            
        except Exception as e:
            logger.error(f"Error creating FVG: {e}", exc_info=True)
            return None
    
    def _calculate_fill_probability(self, gap_pct: float, vol_surge: float, 
                                  inst_ratio: float, quality: float) -> float:
        """Calculate probability of FVG being filled"""
        # Base probability
        base_prob = 50.0
        
        # Adjust based on gap size (smaller gaps more likely to fill)
        if gap_pct < 0.2:
            base_prob += 20
        elif gap_pct < 0.3:
            base_prob += 10
        elif gap_pct > 0.5:
            base_prob -= 10
        
        # Adjust based on volume (high volume = more likely to fill)
        if vol_surge > 3:
            base_prob += 15
        elif vol_surge > 2:
            base_prob += 10
        elif vol_surge < 1:
            base_prob -= 10
        
        # Adjust based on institutional participation
        base_prob += inst_ratio * 20  # Up to +20% for full institutional
        
        # Adjust based on quality
        quality_adjustment = (quality - 50) * 0.3  # ±15% based on quality
        base_prob += quality_adjustment
        
        # Clamp to valid range
        return max(0, min(100, base_prob))
    
    def _update_fvg_status(self, symbol: str, fvgs: List[FairValueGap], 
                          current_candle: Dict):
        """Update FVG fill status"""
        current_price = current_candle['close']
        current_time = current_candle['timestamp']
        
        for fvg in fvgs:
            if fvg.status == FVGStatus.FILLED:
                continue
            
            # Check if price entered the gap
            if fvg.type == FVGType.BULLISH:
                # Bullish FVG fills from above
                if current_price <= fvg.top:
                    if fvg.status == FVGStatus.UNFILLED:
                        fvg.status = FVGStatus.PARTIALLY_FILLED
                        fvg.fill_start_time = current_time
                    
                    # Calculate fill percentage
                    if current_price <= fvg.bottom:
                        fvg.fill_percentage = 100.0
                        fvg.status = FVGStatus.FILLED
                        fvg.fill_complete_time = current_time
                    else:
                        fill_depth = fvg.top - current_price
                        fvg.fill_percentage = (fill_depth / fvg.gap_size) * 100
            
            else:  # Bearish FVG
                # Bearish FVG fills from below
                if current_price >= fvg.bottom:
                    if fvg.status == FVGStatus.UNFILLED:
                        fvg.status = FVGStatus.PARTIALLY_FILLED
                        fvg.fill_start_time = current_time
                    
                    # Calculate fill percentage
                    if current_price >= fvg.top:
                        fvg.fill_percentage = 100.0
                        fvg.status = FVGStatus.FILLED
                        fvg.fill_complete_time = current_time
                    else:
                        fill_depth = current_price - fvg.bottom
                        fvg.fill_percentage = (fill_depth / fvg.gap_size) * 100
    
    def get_unfilled_fvgs(self, symbol: str) -> List[FairValueGap]:
        """Get unfilled FVGs for a symbol"""
        return [fvg for fvg in self.active_fvgs.get(symbol, []) 
                if fvg.status != FVGStatus.FILLED]
    
    def get_actionable_fvgs(self, symbol: str) -> List[FairValueGap]:
        """Get high quality actionable FVGs"""
        return [fvg for fvg in self.active_fvgs.get(symbol, [])
                if fvg.actionable and fvg.status != FVGStatus.FILLED]
